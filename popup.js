let startSlackChannel = document.getElementById('startSlackChannel');
let slackToken = 'SLACK_TOKEN'
let baseSlackUrl = 'https://slack.com/api/'

// Base functionality:
// 1. Get current event
// 2. Pull attendees from event
// 3. Use email addresses to look up IDs in Slack
// 4. Use Slack IDs to start direct message  

startSlackChannel.onclick = function(element) {
  chrome.identity.getAuthToken({interactive: true}, function(token) {
    const date = new Date()
    const currentTime = date.toISOString()
    const timeInOneMin = new Date(date.setMinutes(date.getMinutes() + 1)).toISOString()
    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?'
    const options = {timeMin: currentTime, timeMax: timeInOneMin, orderBy: 'updated'}
    const params = parameterizeOptions(options)
    const url = baseUrl + params
    let payload = {
          method: 'GET',
          async: true,
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          'contentType': 'json'
        };
    fetch(url, payload)
      .then((response) => response.json())
      .then((data) => {
        const event = data.items[data.items.length - 1]
        const attendees = event.attendees
        const emails = attendees.map(a => a.email)
        createSlackChannel(emails)
      })
  });
  };

  // Slack Api Functions

  async function createSlackChannel(emails) {
    const ids = await Promise.all(emails.map(email => handleSlackLookup(email)))
    createConversationFromIds(ids)
  }

  async function handleSlackLookup(email) {
    return await slackLookupByEmail(email)
  }

  function createConversationFromIds(userIds) {
    const options = new URLSearchParams()
    options.append('users', userIds)
    const url = slackUrl('conversations.open')
    const payload = slackPayload(options)

    return fetch(url, payload)
      .then((response) => response.json())
      .then((data) => {
        const channelId = data.channel.id
        const url = 'https://slack.com/app_redirect?channel=' + channelId
        chrome.tabs.create({url: url});
      })
  }

  function slackLookupByEmail(email) {
    const options = new URLSearchParams()
    options.append('email', email)
    const url = slackUrl('users.lookupByEmail')
    const payload = slackPayload(options)

    return fetch(url, payload)
      .then((response) => response.json())
      .then((data) => {
        return data.user.id
      })
  }

  // Utils

  function parameterizeOptions(options) {
    return Object.entries(options).map(([key, val]) => `${key}=${val}`).join('&');
  }

  function slackUrl(apiMethod) {
    return `${baseSlackUrl}${apiMethod}`
  }

  function slackPayload(options) {
    let payload = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + slackToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: options
    }
    return payload
  }