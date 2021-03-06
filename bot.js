var Twitter     = require('twitter'),
    Twit        = require('twit'),
    _           = require('underscore');

// Config
var config      = {
                    consumer_key:         (process.env.CONSUMER_KEY || CONSUMER_KEY),
                    consumer_secret:      (process.env.CONSUMER_SECRET || CONSUMER_SECRET),
                    // One for Twit
                    access_token:         (process.env.ACCESS_TOKEN_KEY || ACCESS_TOKEN_KEY),
                    // One for Twitter
                    access_token_key:     (process.env.ACCESS_TOKEN_KEY || ACCESS_TOKEN_KEY),
                    access_token_secret:  (process.env.ACCESS_TOKEN_SECRET || ACCESS_TOKEN_SECRET)
                };

// Initializing bots
var twitterBot  = new Twitter(config),
    T           = new Twit(config);

// Global vars
var terminals               = {},
    startWords              = [],
    wordStats               = {},
    fIds                    = [],
    totalFollowers          = 0,
    currentFollowerCounter  = 0,
    howManySentences        = 1,
    urls                    = [],
    hashTags                = [],
    parameters              = {
                                exclude_replies: true,
                                include_rts: false,
                                count: 200
                              };

// Get serendipitweets follower ids

T.get('followers/ids', {
    screen_name: 'botserendipity'
}, function (err, data, response) {
    fIds = fIds.concat(data.ids)
    totalFollowers = (fIds.length < 300) ? fIds.length : 300 // Twitter may complain if we're calling its API too many times

    // Once all followers have been harvested we need to get each of their statuses
    getNextFollowerStatuses()
})


// Gets the status of the follower
function getNextFollowerStatuses() {
    // Looping through all followers
    if (currentFollowerCounter < totalFollowers) {
        console.log(currentFollowerCounter + '. Getting tweets from ' + fIds[currentFollowerCounter])
        parameters.user_id = fIds[currentFollowerCounter]
        getUserStatuses(parameters)
        currentFollowerCounter++ // increment counter
    } else {
        console.log(currentFollowerCounter + '. We should be done looping ')
        for (var i = 0; i < howManySentences; i++) {
            var sentence = makeMarkovSentence(3 + Math.floor(3 * Math.random()))
                sentence = _.unescape(sentence)
            if (getRandomNumer() == 2) {
                    sentence = insertExtras(sentence)
            }
            T.post('statuses/update', { status: sentence }, function(err, data, response) {
              console.log(data)
            })
        }
    }
}


function getUserStatuses(parameters) {
    // console.log(parameters)
    twitterBot.get('statuses/user_timeline', parameters, function (error, tweets, response) {
        if (!error) {

            for (var i = 0; i < tweets.length; i++)
            {
                var tweet = tweets[i]
                // HASHTAGS
                if (tweet.entities.hashtags)
                {
                    tweet.entities.hashtags.forEach(function(hashtag, key)
                    {
                        hashTags = _(hashTags.concat(hashtag.text)).unique()
                    })
                }
                // URLS
                if (tweet.entities.urls)
                {
                    tweet.entities.urls.forEach(function(url, key)
                    {
                        urls = _(urls.concat(url.expanded_url)).unique()
                    })
                }

                // Tweet sanitation
                var text = tweet.text
                text = removeUrls(text)
                text = removeHashtags(text)
                text = removeMentions(text)
                text = removePunctuation(text)
                var words = text.split(' ')

                terminals[words[words.length - 1]] = true
                startWords.push(words[0])

                for (var j = 0; j < words.length - 1; j++) {
                    if (wordStats.hasOwnProperty(words[j])) {
                        wordStats[words[j]].push(words[j + 1])
                    } else {
                        wordStats[words[j]] = [words[j + 1]]
                    }
                }
            }

            getNextFollowerStatuses()

        } else if (error) {
          currentFollowerCounter++
          getNextFollowerStatuses()
        } else {
          console.log(error)
        }
    })
}

// Remove Urls from tweets
function removeUrls(string) {
    return string.replace(/(?:https?|ftp):\/\/[\n\S]+/ig, '')
}

// Remove Hashtags from tweets
function removeHashtags(string) {
    return string.replace(/\S*#(?:\[[^\]]+\]|\S+)/ig, '')
}

// Remove Mentions from tweets
function removeMentions(string) {
    return string.replace(/\B@[a-z0-9_-]+/ig, '')
}
function removePunctuation(string) {
    return string.replace(/[.-\/#!$%\^\*;:{}=\-_`~()]/g,'')
}

// Get a random element of an array
function getRandomElement(array) {
    var randomIndex = Math.floor(array.length * Math.random())
    return array[randomIndex]
}

// Markovify
function makeMarkovSentence(minLength) {
    word = getRandomElement(startWords)
    var sentence = [word]
    while (wordStats.hasOwnProperty(word)) {
        var next_words = wordStats[word]
        word = getRandomElement(next_words)
        sentence.push(word)
        if (sentence.length > minLength && terminals.hasOwnProperty(word)) break
    }
    if (sentence.length < minLength) return makeMarkovSentence(minLength)
    return sentence.join(' ')
}

// Adding extras
function insertExtras(sentence) {

    var randomHashtag = getRandomElement(hashTags)
    var randomUrl = getRandomElement(urls)

    sentence += " #"+randomHashtag + " " + randomUrl
    return sentence
}
function getRandomNumer() {
    return Math.floor(Math.random() * 4) + 1
}
