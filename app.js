const express = require('express')
const app = express()
const port = 3000
const axios = require('axios').default;
const bodyParser = require("body-parser")

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const roles = [
  "owner", "founder", "creator", "ceo", "cco", "leader", "director", "marketing", "analytics", "engineer", "team", "manager", "overseer", "dev", "programmer", "script", "build", "model", "gfx", "ui", "artist", "contributor", "help", "design", "voice", "translat", "former"
]

async function getFullArray(url) {
  let nextPageCursor;
  let fullArray = [];
  do {
    let data;
    try {
      let u = url.concat(nextPageCursor === undefined ? "" : "cursor=".concat(nextPageCursor))
      const response = await axios.get(u)
      data = response.data.data;
      
      fullArray = fullArray.concat(data)
      nextPageCursor = response.data.nextPageCursor
    } catch (error) {
      //console.log(error)
    }
  } while (nextPageCursor !== null);
  return fullArray
}

async function getUserData(username) {
  let data;
  try {
    const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [
        username
      ]
    });
    data = response.data.data[0]
  } catch (error) {
    console.log(error);
  }
  return data;
}

async function getUserPlaceData(id) {
  let data = {
    Games: await getFullArray(`https://games.roblox.com/v2/users/${id}/games?limit=50&`)
  }
  data.Games.sort((g1, g2) => g2.placeVisits - g1.placeVisits)
  data.Total = 0
  for (place of data.Games) {
    data.Total += place.placeVisits
  }
  return data
}

async function roleCounts(Group, name, displayName) {
  let role = Group.role
  let group = Group.group
  if (role.rank >= 254) {
    return true
  }
  try {
    const response = await axios.get(`https://groups.roblox.com/v1/groups/${group.id}/roles`)
    let a = response.data.roles.find((r) => r.id === role.id)
    if (a.memberCount > 100) {
      return false
    }
  } catch (error) {
    console.log("error")
  }
  if (role.name === name || role.name === displayName) {
    return true
  }
  const roleName = role.name.toLowerCase()
  for (const currentRole of roles) {
    const found = roleName.match(currentRole)
    if (found) {
      return found
    }
  }
  return false
}

async function getCountedGroups(id, name, displayName) {
  let data = {}
  try {
    const response = await axios.get(`https://groups.roblox.com/v2/users/${id}/groups/roles`)
    data.Groups = response.data.data
  } catch (error) {
    console.log(error)
  }
  let newGroups = []
  for (group of data.Groups) {
    let a = await roleCounts(group, name, displayName)
    if (a) {
      newGroups.push(group)
    }
  }
  data.Groups = newGroups
  return data
}

async function groupData(groupId) {
  let games = await getFullArray(`https://games.roblox.com/v2/groups/${groupId}/gamesV2?limit=50&accessFilter=2&`)
  return games
}

async function getGroupData(id, name, displayName) {
  let data = {}
  data.Groups = await getCountedGroups(id, name, displayName)
  data.Groups.Groups.sort((g1, g2) => g2.group.memberCount - g1.group.memberCount)
  data.Members = 0
  for (group of data.Groups.Groups) {
    data.Members += group.group.memberCount
  }
  return data
}

async function getGroupPlaceData(data) {
  let newData = {}
  let games = []
  for (const group of data.Groups.Groups) {
    await sleep(500)
    games = games.concat(await groupData(group.group.id))
  }
  games.sort((g1, g2) => g2.placeVisits - g1.placeVisits)
  newData.Games = games
  newData.Total = 0
  for (place of newData .Games) {
    newData.Total += place.placeVisits
  }

  return newData
}

async function buildData(username) {
  let data = {}
  data.UserData = await getUserData(username)
  data.UserPlaceData = await getUserPlaceData(data.UserData.id)
  data.GroupData = await getGroupData(data.UserData.id, data.UserData.name, data.UserData.displayName)
  data.GroupPlaceData = await getGroupPlaceData(data.GroupData)
  return data
}

app.use(bodyParser.text())

app.get('/:username', async (req, res) =>  {
  const data = await buildData(req.params.username)
  res.send(data)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})