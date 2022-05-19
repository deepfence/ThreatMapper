# Example: out_multiinstance

The following example code implements an output plugin that works with
multiple configured instances. It describes how to share context from the
specified instance configuration to the flush callback.

Every output plugin go through four callbacks associated to different phases:

| Plugin Phase        | Callback                   |
|---------------------|----------------------------|
| Registration        | FLBPluginRegister()        |
| Initialization      | FLBPluginInit()            |
| Runtime Flush       | FLBPluginFlushCtx()        |
| Exit                | FLBPluginExitCtx()         |

## Plugin Registration

When Fluent Bit loads a Golang plugin, it looks up and loads the registration
callback that aims to populate the internal structure with plugin name and
description:

```go
//export FLBPluginRegister
func FLBPluginRegister(def unsafe.Pointer) int {
	return output.FLBPluginRegister(ctx, "multiinstance", "Testing multiple instances")
}
```

This function is invoked at start time _before_ any configuration is done
inside the engine.

## Plugin Initialization

Before the engine starts, it initializes all plugins that were configured.
As part of the initialization, the plugin can obtain configuration parameters
and do any other internal checks. It can also set the context for this
instance in case params need to be retrieved during flush.
E.g:

```go
//export FLBPluginInit
func FLBPluginInit(ctx unsafe.Pointer) int {
	id := output.FLBPluginConfigKey(plugin, "id")
	log.Printf("[multiinstance] id = %q", id)
	// Set the context to point to any Go variable
	output.FLBPluginSetContext(plugin, id)
	return output.FLB_OK
}
```

The function must return FLB\_OK when it initialized properly or FLB\_ERROR if
something went wrong. If the plugin reports an error, the engine will _not_
load the instance.

## Runtime Flush with Context

Upon flush time, when Fluent Bit wants to flush it's buffers, the runtime flush
callback will be triggered.

The callback will receive the configuration context, a raw buffer of msgpack
data, the proper bytes length and the associated tag.

```go
//export FLBPluginFlushCtx
func FLBPluginFlushCtx(ctx, data unsafe.Pointer, length C.int, tag *C.char) int {
	// Type assert context back into the original type for the Go variable
	id := output.FLBPluginGetContext(ctx).(string)
	log.Printf("[multiinstance] Flush called for id: %s", id)
	return output.FLB_OK
}
```

When done, there are three returning values available:

| Return value  | Description                                    |
|---------------|------------------------------------------------|
| FLB\_OK       | The data have been processed normally.         |
| FLB\_ERROR    | An internal error have ocurred, the plugin will not handle the set of records/data again. |
| FLB\_RETRY    | A recoverable error have ocurred, the engine can try to flush the records/data later.|

## Plugin Exit

When Fluent Bit will stop using the instance of the plugin, it will trigger the exit callback. e.g:

```go
//export FLBPluginExitCtx
func FLBPluginExitCtx(ctx unsafe.Pointer) int {
	return output.FLB_OK
}
```

## Playground

Build the docker image locally to see how it works.

```bash
$ docker build . -t fluent-bit-multiinstance -f examples/out_multiinstance/Dockerfile
$ docker run -it --rm fluent-bit-multiinstance
```

The output produced should resemble the following:
```
Fluent Bit v1.1.0
Copyright (C) Treasure Data

[2019/05/17 22:33:04] [ info] [storage] initializing...
[2019/05/17 22:33:04] [ info] [storage] in-memory
[2019/05/17 22:33:04] [ info] [storage] normal synchronization mode, checksum
disabled
[2019/05/17 22:33:04] [ info] [engine] started (pid=1)
2019/05/17 22:33:04 [multiinstance] id = "cpu_metrics"
2019/05/17 22:33:04 [multiinstance] id = "dummy_metrics"
[2019/05/17 22:33:04] [ info] [sp] stream processor started
2019/05/17 22:33:09 [multiinstance] Flush called for id: cpu_metrics
[0] cpu.local: [2019-05-17 22:33:05.0007371 +0000 UTC, {"cpu0.p_user": 0, "cpu1.p_cpu": 3, "cpu2.p_cpu": 0, "cpu3.p_user": 0, "cpu_p": 1.5, "system_p": 1.25, "cpu0.p_cpu": 3, "cpu0.p_system": 3, "cpu1.p_user": 1, "cpu2.p_system": 0, "cpu2.p_user": 0, "cpu3.p_cpu": 0, "cpu3.p_system": 0, "user_p": 0.25, "cpu1.p_system": 2, }
[1] cpu.local: [2019-05-17 22:33:06.0026806 +0000 UTC, {"cpu1.p_user": 0, "cpu2.p_system": 0, "cpu1.p_system": 0, "cpu2.p_cpu": 0, "cpu3.p_user": 0, "cpu0.p_system": 0, "cpu1.p_cpu": 0, "system_p": 0, "cpu0.p_cpu": 0, "cpu0.p_user": 0, "cpu2.p_user": 0, "cpu3.p_cpu": 0, "cpu3.p_system": 0, "cpu_p": 0, "user_p": 0, }
[2] cpu.local: [2019-05-17 22:33:07.002157 +0000 UTC, {"user_p": 0, "cpu0.p_system": 0, "cpu1.p_user": 0, "cpu3.p_user": 0, "cpu3.p_system": 0, "system_p": 0.25, "cpu0.p_user": 0, "cpu1.p_cpu": 1, "cpu2.p_user": 0, "cpu_p": 0.25, "cpu0.p_cpu": 0, "cpu1.p_system": 1, "cpu2.p_cpu": 0, "cpu3.p_cpu": 0, "cpu2.p_system": 0, }
[3] cpu.local: [2019-05-17 22:33:08.0014056 +0000 UTC, {"cpu0.p_cpu": 0, "cpu2.p_cpu": 0, "user_p": 0, "cpu1.p_cpu": 1, "cpu1.p_user": 0, "cpu1.p_system": 1, "cpu2.p_system": 0, "cpu3.p_cpu": 0, "cpu0.p_user": 0, "cpu2.p_user": 0, "cpu3.p_system": 0, "cpu_p": 0.25, "system_p": 0.25, "cpu0.p_system": 0, "cpu3.p_user": 0, }
2019/05/17 22:33:09 [multiinstance] Flush called for id: dummy_metrics
[0] dummy.local: [2019-05-17 22:33:05.0008583 +0000 UTC, {"message": [100 117 109 109 121], }
[1] dummy.local: [2019-05-17 22:33:06.0027443 +0000 UTC, {"message": [100 117 109 109 121], }
[2] dummy.local: [2019-05-17 22:33:07.0022096 +0000 UTC, {"message": [100 117 109 109 121], }
[3] dummy.local: [2019-05-17 22:33:08.0014587 +0000 UTC, {"message": [100 117 109 109 121], }
```

As you can see each instance has their own set of outputs along with the
configuration context made available.
