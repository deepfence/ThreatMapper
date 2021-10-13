package shellescape_test

import (
	"testing"

	"github.com/alessio/shellescape"
)

func assertEqual(t *testing.T, s, expected string) {
	if s != expected {
		t.Errorf("%q (expected: %q)", s, expected)
	}
}

func TestEmptyString(t *testing.T) {
	s := shellescape.Quote("")
	expected := "''"
	assertEqual(t, s, expected)
}

func TestDoubleQuotedString(t *testing.T) {
	s := shellescape.Quote(`"double quoted"`)
	expected := `'"double quoted"'`
	assertEqual(t, s, expected)
}

func TestSingleQuotedString(t *testing.T) {
	s := shellescape.Quote(`'single quoted'`)
	expected := `''"'"'single quoted'"'"''`
	assertEqual(t, s, expected)
}

func TestUnquotedString(t *testing.T) {
	s := shellescape.Quote(`no quotes`)
	expected := `'no quotes'`
	assertEqual(t, s, expected)
}

func TestSingleInvalid(t *testing.T) {
	s := shellescape.Quote(`;`)
	expected := `';'`
	assertEqual(t, s, expected)
}

func TestAllInvalid(t *testing.T) {
	s := shellescape.Quote(`;${}`)
	expected := `';${}'`
	assertEqual(t, s, expected)
}

func TestCleanString(t *testing.T) {
	s := shellescape.Quote("foo.example.com")
	expected := `foo.example.com`
	assertEqual(t, s, expected)
}

func TestQuoteCommand(t *testing.T) {
	s := shellescape.QuoteCommand([]string{"ls", "-l", "file with space"})
	expected := `ls -l 'file with space'`
	assertEqual(t, s, expected)
}

func TestStripUnsafe(t *testing.T) {
	type args struct {
		s string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{"all ASCII printable characters", args{`"printable!" characters '' 12321312"`}, `"printable!" characters '' 12321312"`},
		{"some non printable characters", args{"print\u0081ble"}, "printble"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shellescape.StripUnsafe(tt.args.s); got != tt.want {
				t.Errorf("StripUnsafe() = %v, want %v", got, tt.want)
			}
		})
	}
}