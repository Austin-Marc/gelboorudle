class Crypto {
    /**
     * Decrypt data using XOR cipher with key
     * @param {string} encryptedData - Base64 encoded encrypted string
     * @param {string} key - Encryption key
     * @returns {string} Decrypted string
     */
    static xorDecrypt(encryptedData, key) {
        try {
            // Decode from Base64
            const decoded = atob(encryptedData);
            
            // XOR decrypt
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                const keyChar = key[i % key.length];
                const decryptedChar = String.fromCharCode(
                    decoded.charCodeAt(i) ^ keyChar.charCodeAt(0)
                );
                decrypted += decryptedChar;
            }
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return '';
        }
    }
    
    /**
     * Decrypt all tag counts in game data
     * @param {Object} gameData - Game data with encrypted counts
     * @returns {Array} Tags with decrypted counts
     */
    static decryptGameData(gameData) {
        const key = gameData.key;
        const decryptedTags = [];
        
        for (const tag of gameData.tags) {
            const decryptedCount = this.xorDecrypt(tag.encrypted_count, key);
            
            decryptedTags.push({
                ...tag,
                count: parseInt(decryptedCount, 10)
            });
        }
        
        return decryptedTags;
    }
}

