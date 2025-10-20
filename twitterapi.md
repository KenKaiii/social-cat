Response format
Sucess response format

Please check the example responses at the "Endpoints" page for seing the response structure. :)

Error response format

{"error":"error message"}
/search - category options
In the last update search categories were added. With this it is now possible to better order the output of /search.
There also is the possibility to go to the next page. For that pass the "cursor" query param with the cursor-top or cursor-bottom value. Next page should be cursor-bottom, previous page cursor-top.

The following options are now available:

Top
Latest
People
Photos
Videos
Search filters have also been added. A stringified JSON containing an object and with the following options can be sent via ?filters. The filters work the same way as in the Twitter/X mobile or web app.

lang (string)
This allows tweets to be sorted by language. An Alpha-2 country code must be provided for this. country codes
Example:

{
  "lang": "en"
}
since (string)
"since" can be used to set a start date for a date range. Without "until", the date range applies from "since" until now. The format "YYYY-MM-DD" must be transmitted.
Example:

{
  "since": "2020-10-31"
}
until (string)
"until" can be used to set a end date for a date range. Without "since", the date range applies from first tweeets until "until". The format "YYYY-MM-DD" must be transmitted.
Example:

{
  "until": "2023-01-20"
}
exactSentence (string)
"exactSentence" can be used to search for a complete sentence. The filter requires that the sentence is contained in the tweet.
Example:

{
  "exactSentence": "And the winner is"
}
anyOfTheseWords (string array)
This will display every tweet that contains one of the words. An array of strings must be passed.
Example:

{
  "anyOfTheseWords": [
    "winner",
    "champion"
  ]
}
noneOfTheseWords (string array)
This will display every tweet that does not contain these words. An array of strings must be passed.
Example:

{
  "noneOfTheseWords": [
    "winner",
    "spoiler"
  ]
}
hashtags (string array)
This will display every tweet that contain all of the hashtags. An array of strings must be passed.
Example:

{
  "hashtags": [
    "Oscars",
    "AcademyAwards"
  ]
}
fromTheseAccounts (string array)
This will display every tweet that is posted by one of the accounts. An array of strings must be passed.
Example:

{
  "fromTheseAccounts": [
    "elonmusk",
    "X"
  ]
}
toTheseAccounts (string array)
This will display every tweet/reply that is posted as an answer to one of the accounts. An array of strings must be passed.
Example:

{
  "toTheseAccounts": [
    "elonmusk"
  ]
}
mentionsTheseAccounts (string array)
This will display every tweet that mention one of the accounts. An array of strings must be passed.
Example:

{
  "mentionsTheseAccounts": [
    "jimmykimmel"
  ]
}
removePostsWithLinks (boolean)
This will not show tweets which include a link.
Example:

{
  "removePostsWithLinks": true
}
onlyPostsWithLinks (boolean)
This will only show tweets which include a link.
Example:

{
  "onlyPostsWithLinks": true
}
removeReplies (boolean)
This will exclude replies from the search results.
Example:

{
  "removeReplies": true
}
onlyReplies (boolean)
This will only show replies in the search results.
Example:

{
  "onlyReplies": true
}
removePostsWithMedia (boolean)
This will not show tweets which include any type of media.
Example:

{
  "removePostsWithMedia": true
}
onlyPostsWithMedia (boolean)
This will only show tweets which include any type of media.
Example:

{
  "onlyPostsWithMedia": true
}
removePostsWithVideo (boolean)
This will not show tweets which include a video.
Example:

{
  "removePostsWithVideo": true
}
onlyPostsWithVideo (boolean)
This will only show tweets which include a video.
Example:

{
  "onlyPostsWithVideo": true
}
removePostsWithPhotos (boolean)
This will not show tweets which include photos.
Example:

{
  "removePostsWithPhotos": true
}
onlyPostsWithPhotos (boolean)
This will only show tweets which include photos.
Example:

{
  "onlyPostsWithPhotos": true
}
linksInclude (string)
This will filter tweets by checking if the link contains a word.
Example:

{
  "linksInclude": "oscars"
}
minimumRepliesCount (integer)
This means that only tweets with at least this number of replies can be displayed.
Example:

{
  "minimumRepliesCount": 10
}
minimumRetweetsCount (integer)
This means that only tweets with at least this number of retweets can be displayed.
Example:

{
  "minimumRetweetsCount": 100
}
minimumLikesCount (integer)
This means that only tweets with at least this number of likes can be displayed.
Example:

{
  "minimumLikesCount": 520
}
includeRetweets
With this filter you will also get retweets matching your search term and other filters

{
  "includeRetweets": true
}
geocode (lat,lng as string)
Tweets can be restricted to a specific location using the geocode. This requires the geocode from latitude and longitude. You can get these values from Google Maps or geocode.xyz.
Example:

{
  "geocode": "40.76997,-73.97225"
}
radius (integer)
The geocode also assumes a radius. This is specified in kilometers and is 10km by default.
Example:

{
  "radius": 100
}
> Twitter AIO does not charge for 500 errors!
