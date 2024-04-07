module.exports = function sanitizeMessage(message) {
    if (typeof message === 'string') {
      const normalizedMessage = Diacritics.remove(message);
      return bannedWords.reduce((acc, word) => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        return acc.replace(regex, '*'.repeat(word.length));
      }, normalizedMessage);
    } else {
      const normalizedMessage = Diacritics.remove(message.toString('utf-8'));
      return bannedWords.reduce((acc, word) => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        return acc.replace(regex, '*'.repeat(word.length));
      }, normalizedMessage);
    }
}