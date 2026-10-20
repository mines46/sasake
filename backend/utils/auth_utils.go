package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strings"
)

// HashPassword hashes a raw password with a cryptographically secure 16-byte random salt.
// Returns a string formatted as "salt_hex:hash_hex".
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate password salt: %w", err)
	}

	hasher := sha256.New()
	hasher.Write(salt)
	hasher.Write([]byte(password))
	hash := hasher.Sum(nil)

	return fmt.Sprintf("%x:%x", salt, hash), nil
}

// CheckPassword verifies that raw password matches the stored "salt_hex:hash_hex".
// Uses constant time comparison to prevent timing attacks.
func CheckPassword(password, encodedHash string) bool {
	parts := strings.Split(encodedHash, ":")
	if len(parts) != 2 {
		return false
	}

	salt, err := hex.DecodeString(parts[0])
	if err != nil {
		return false
	}

	expectedHash, err := hex.DecodeString(parts[1])
	if err != nil {
		return false
	}

	hasher := sha256.New()
	hasher.Write(salt)
	hasher.Write([]byte(password))
	actualHash := hasher.Sum(nil)

	return subtle.ConstantTimeCompare(expectedHash, actualHash) == 1
}

