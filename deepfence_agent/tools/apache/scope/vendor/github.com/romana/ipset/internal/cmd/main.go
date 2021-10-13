package main

import (
	"context"
	"encoding/xml"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/romana/ipset"
)

func main() {
	flagFile := flag.String("file", "", "")
	flagCmd := flag.String("cmd", "add", "")
	flagSet1 := flag.String("set1", "", "")
	flagSet2 := flag.String("set2", "", "")
	flagType := flag.String("type", "", "")
	flagMember := flag.String("member", "", "")
	flagLoad := flag.Bool("load", false, "")
	flagVersion := flag.Bool("version", false, "")
	flagInteractive := flag.Bool("i", false, "")
	flag.Parse()

	if *flagFile != "" {
		data, err := ioutil.ReadFile(*flagFile)
		if err != nil {
			panic(err)
		}

		var sets ipset.Ipset
		err = xml.Unmarshal(data, &sets)
		if err != nil {
			panic(err)
		}

		spew.Dump(sets)

		os.Exit(0)
	}

	if *flagLoad {
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()
		sets, err := ipset.Load(ctx)
		if err != nil {
			panic(err)
		}

		spew.Dump(sets)

		os.Exit(0)
	}

	var err error
	if *flagVersion {
		v, err := ipset.Version()
		spew.Dump(v, err, v.Check())
		os.Exit(0)

	}

	var handle *ipset.Handle

	if *flagInteractive {
		handle, err = ipset.NewHandle()
		if err != nil {
			panic(err)
		}

		err = handle.Start()
		if err != nil {
			panic(err)
		}
	}

	switch *flagCmd {
	case "add":
		set := &ipset.Set{Name: *flagSet1, Members: []ipset.Member{{Elem: *flagMember}}}
		if *flagInteractive {
			err = handle.Add(set)
			if err != nil {
				panic(err)
			}
			break

		}
		out, err := ipset.Add(set)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}

	case "del":
		set := &ipset.Set{Name: *flagSet1, Members: []ipset.Member{{Elem: *flagMember}}}
		if *flagInteractive {
			err = handle.Delete(set)
			if err != nil {
				panic(err)
			}
			break

		}
		out, err := ipset.Delete(set)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}
	case "create":
		set := &ipset.Set{Name: *flagSet1, Type: ipset.SetType(*flagType)}
		if *flagInteractive {
			err = handle.Create(set)
			if err != nil {
				panic(err)
			}
			break

		}
		out, err := ipset.Create(set)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}
	case "test":
		set := &ipset.Set{Name: *flagSet1, Members: []ipset.Member{{Elem: *flagMember}}}
		out, err := ipset.Test(set)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}

	case "destroy":
		set := &ipset.Set{Name: *flagSet1}
		if *flagInteractive {
			err = handle.Destroy(set)
			if err != nil {
				panic(err)
			}
			break

		}
		out, err := ipset.Destroy(set)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}
	case "flush":
		set := &ipset.Set{Name: *flagSet1}
		if *flagInteractive {
			err = handle.Flush(set)
			if err != nil {
				panic(err)
			}
			break

		}
		out, err := ipset.Flush(set)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}
	case "swap":
		set1 := &ipset.Set{Name: *flagSet1}
		set2 := &ipset.Set{Name: *flagSet2}
		if *flagInteractive {
			err = handle.Swap(set1, set2)
			if err != nil {
				panic(err)
			}
			break
		}

		out, err := ipset.Swap(set1, set2)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}

	case "rename":
		set1 := &ipset.Set{Name: *flagSet1}
		set2 := &ipset.Set{Name: *flagSet2}

		out, err := ipset.Rename(set1, set2)
		fmt.Printf("CombinedOutput: %s\n", out)
		if err != nil {
			panic(err)
		}

	default:
		panic("Unknown command")
	}

	if *flagInteractive {
		err = handle.Quit()
		if err != nil {
			panic(err)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()
		err = handle.Wait(ctx)
		if err != nil {
			panic(err)
		}
	}

	return
}
