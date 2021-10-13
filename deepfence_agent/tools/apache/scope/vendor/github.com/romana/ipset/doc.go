// Package ipset provides bindings for linux userspace ipset utility
// http://ipset.netfilter.org/ipset.man.html
//
// Ipset allows for managing iptables rules in complex environments where
// otherwise iptables rules would become too huge or would have to be updated
// too often.
//
// Similarly, this package provides bindings to configure ipset
// programmatically.
//
// Because ipset is typically used in environments with large ipset configurations
// it is not practical to rely on simple commands like `ipset add`
// or `ipset create` since thousands of `create` calls would result
// in thousands of forks.
//
// Instead, this package utilizes interactive mode provided by `ipset -`
// to execute bulks of create/delete/add/flush/swap calls in one session.
// The internal object to start and control interactive session called `Handle`.
// It implements `io.Writer` and writes directly into ipset stdin.
//
// However, some commands still make more sense when executed one by one
// like `test`, for that reason this package also provides a set of functions
// called `oneshots` (Add/Delete/etc...) which can be used when exit code is needed.
//
// Since ipset can export its configuration in xml format this package provides structures
// that can be used to parse ipset xml config.
//
// Logging: this package is mostly silent to avoid messing with ipset stderr,
// but some debug loggin can be enabled using RLOG_TRACE_LEVEL=3 environment variable.
//
// Typical session starts as
//
//	iset, _ := ipset.Load(context.Background())
//	for _, set := range iset.Sets {
//		fmt.Printf("Set %s of type %s has %d members\n", set.Name, set.Type, len(set.Members))
//	}
//
//	Output:
//	Set host of type hash:net has 2 members
//	Set host2 of type hash:net has 12 members
//	Set timeoutSet of type hash:ip has 0 members
//	Set commentSet of type hash:ip has 1 members
//	Set countersSet of type hash:ip has 1 members
//	Set skbSet of type hash:ip has 1 members
//	Set host3 of type hash:net has 1 members
//	Set super of type list:set has 2 members
//
//
// Interactive sessions workflow
// Pros: useful to create/delete large sets
// Cons: no error handling
//
//	1. Acquire the handle.
//	handle, _ := ipset.NewHandle()
//
//	2. Start the session.
//	   This is the point where ipset binary is executed and stdin/stdout are attached.
//	_ = handle.Start()
//
//	3. Call Add/Delete/etc methods of handle.
//	newSet, _ = ipset.NewSet("mynewset", SetHashNetIface, SetWithComment())
//	_ = handle.Create(newSet)
//
//	4. When you are done shut down the session.
//	   This will send shutdown signal to the ipset binary which should exit.
//	_ = handle.Quit()
//
//	5. And cleanup the resources.
//	   After successful Quit() call ipset binary should be terminated, but
//	   resources allocated for handler might still be in use, like stdin/our/err pipes.
//	ctx, cancel := context.WithTimeout(...)
//	_ = handle.Wait(ctx)
//
//	that's it.
//
// And non-interactive session might be useful for commands that require distict error code.
// Pros: clear error and output
// Cons: fork per call
//
//	# ipset save
//	Output:
//	create super list:set size 8
//	add super host
//
//	testSet, _ = ipset.NewSet("super", SetListSet)
//	testMember, _ = ipset.NewMember("host", newSet)
//	_, err := ipset.Test(testSet)
//
// Options
//
// This package uses options functions as a way to specify desired configuration.
// This is done to keep default signatures simple like `NewHandle()` while allowing
// flexible configuration when needed
// 	`NewHandle(HandleWithBin("/root/ipset"), HandleWithArgs("-"))
// Learn more about options functions https://commandcenter.blogspot.co.nz/2014/01/self-referential-functions-and-design.html
package ipset
