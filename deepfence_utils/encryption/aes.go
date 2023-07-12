package encryption

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
)

type AES struct {
	IV  string `json:"aes_iv"`
	Key string `json:"aes_key"`
}

const blockSize = aes.BlockSize

func (a *AES) Encrypt(plaintext string) (string, error) {
	bKey, err := hex.DecodeString(a.Key)
	if err != nil {
		return "", err
	}
	bIV, err := hex.DecodeString(a.IV)
	if err != nil {
		return "", err
	}
	bPlaintext := PKCS5Padding([]byte(plaintext), blockSize, len(plaintext))
	block, err := aes.NewCipher(bKey)
	if err != nil {
		return "", err
	}
	ciphertext := make([]byte, len(bPlaintext))
	mode := cipher.NewCBCEncrypter(block, bIV)
	mode.CryptBlocks(ciphertext, bPlaintext)
	return hex.EncodeToString(ciphertext), nil
}

func (a *AES) Decrypt(cipherText string) (string, error) {
	bKey, err := hex.DecodeString(a.Key)
	if err != nil {
		return "", err
	}
	bIV, err := hex.DecodeString(a.IV)
	if err != nil {
		return "", err
	}
	cipherTextDecoded, err := hex.DecodeString(cipherText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(bKey)
	if err != nil {
		return "", err
	}

	mode := cipher.NewCBCDecrypter(block, bIV)
	mode.CryptBlocks([]byte(cipherTextDecoded), []byte(cipherTextDecoded))
	return string(PKCS5UnPadding(cipherTextDecoded)), nil
}

func PKCS5Padding(ciphertext []byte, blockSize int, after int) []byte {
	padding := (blockSize - len(ciphertext)%blockSize)
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

func PKCS5UnPadding(src []byte) []byte {
	length := len(src)
	unpadding := int(src[length-1])
	if unpadding > length {
		return src
	}
	return src[:(length - unpadding)]
}
