/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
 let GenerateRandomString = function(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

/**
 * Takes song items' array and parses and 
 * aggregates them by artist
 * @param {{ added_at: string, track: [Object] }[]}
 */

module.exports = {GenerateRandomString}