import { global } from './global.js'

const svFilterRegionDoc = document.getElementById('serverFilterRegion')
const svFilterModeDoc = document.getElementById('serverFilterMode')

let servers

const serverMap = {}
let tbody
let serversDocs

const availableServers = []

global.loadServerSelector = (serverData, text) => {
  if (!serverData.length) {
    if (text) loadEmptyServerSelector(text)
    return
  }
  document.getElementById('startButton').disabled = false
  servers = serverData
  let id = location.hash.slice(1)
  if (!servers.some(server => server.id === id)) id = localStorage.getItem('lastServer')
  if (!servers.some(server => server.id === id)) id = servers[0].id
  const serverSelector = document.getElementById('serverSelector')
  tbody = document.createElement('tbody')
  serversDocs = document.createElement('center')
  serverSelector.innerHTML = ''
  serverSelector.appendChild(tbody)
  serversDocs.id = 'serverList'
  tbody.appendChild(serversDocs)
  let myServer = {
    classList: {
      contains: () => true
    }
  }

  // If you dont want have a server filter, just dont run this function.
  initializeFilter()

  servers.forEach(async (server) => {
    try {
      const tr = document.createElement('tr')
      const td1 = document.createElement('td')
      td1.textContent = `${server.region}`
      const td2 = document.createElement('td')
      td2.classList.add('tdCenter')
      td2.textContent = `${server.gameMode}`
      const td3 = document.createElement('td')
      td3.textContent = `${server.players}/${server.maxPlayers}`
      tr.appendChild(td1)
      tr.appendChild(td2)
      tr.appendChild(td3)
      server.featured && tr.classList.add('featured') // make the text yellow if its featured.
      tr.onclick = () => {
        if (myServer.classList.contains('selected')) {
          myServer.classList.remove('selected')
        }
        myServer = tr
        location.hash = '#' + server.id
        global.locationHash = location.hash
        localStorage.setItem('lastServer', server.id)
        tr.classList.add('selected'), (global.serverAdd = server.ip)
        if (!global.serverAdd || ['localhost', '127.0.0.1', '::1'].includes(global.serverAdd)) {
          global.serverAdd = location.hostname
        }
        if (server.port && !global.serverAdd.includes(':')) {
          global.serverAdd = global.serverAdd + ':' + server.port
        }
      }
      serversDocs.appendChild(tr)
      serverMap[server.id] = tr
      global.serverMap[server.ip] = tr
      if (id === server.id) myServer = tr
      availableServers.push({ element: tr, region: server.region, gameMode: server.gameMode, id: server.id })
    } catch (e) {
      console.log(e)
    }
    if (myServer.onclick) myServer.onclick()
  })
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1)
    if (!serverMap[id]) return
    serverMap[id].onclick()
  })
}

const loadEmptyServerSelector = (text) => {
  const serverSelector = document.getElementById('serverSelector')
  const tbody = document.createElement('tbody')
  serverSelector.innerHTML = ''
  serverSelector.style.display = 'block'
  serverSelector.appendChild(tbody)
  const tr = document.createElement('tr')
  const td1 = document.createElement('td')
  td1.textContent = ''
  const td2 = document.createElement('td')
  td2.className = 'tdCenter'
  td2.textContent = `${text}`
  const td3 = document.createElement('td')
  td3.textContent = ''
  tr.appendChild(td1)
  tr.appendChild(td2)
  tr.appendChild(td3)
  tbody.appendChild(tr)
  document.getElementById('startButton').disabled = true
}

const initializeFilter = () => {
  global.filters = {
    regions: {
      all: [],
      america: [],
      europe: [],
      asia: [],
      other: []
    },
    gamemodeFilters: {
      all: [],
      ffa: [],
      squads: [],
      tdm: [],
      minigames: [],
      sandbox: []
    }
  }
  const nvmText = document.createElement('td')
  nvmText.textContent = 'No Server Matches'
  nvmText.classList.add('tdCenter')
  const noServerMatches = document.createElement('tr')
  noServerMatches.classList.add('message')
  noServerMatches.appendChild(nvmText)
  noServerMatches.style.display = 'none'
  noServerMatches.style.width = '325px'
  tbody.appendChild(noServerMatches)

  for (const s of servers) {
    global.filters.gamemodeFilters.all.push(s)
    global.filters.regions.all.push(s)
    if (s.region == 'US West' || s.region == 'US Central' || s.region == 'US East') global.filters.regions.america.push(s)
    if (s.region == 'Europe') global.filters.regions.europe.push(s)
    if (s.region == 'Asia' || s.region == 'Oceania') global.filters.regions.asia.push(s)
    if (
      !global.filters.regions.america.includes(s) &&
            !global.filters.regions.europe.includes(s) &&
            !global.filters.regions.asia.includes(s)
    ) {
      global.filters.regions.other.push(s)
    }
    if (
      s.gameMode.includes('FFA') ||
            s.gameMode.includes('Maze') ||
            s.gameMode.includes('Manhunt')
    ) global.filters.gamemodeFilters.ffa.push(s)
    if (
      s.gameMode.includes('TDM')
    ) global.filters.gamemodeFilters.tdm.push(s)
    if (
      s.gameMode.includes('Domination') ||
            s.gameMode.includes('Mothership')
    ) global.filters.gamemodeFilters.minigames.push(s)
    if (
      s.gameMode.includes('Sandbox')
    ) global.filters.gamemodeFilters.sandbox.push(s)
  };
  const l = []
  const createFilter = (type, data) => {
    const r = l.length
    l.push(data[0].filter)
    const e = document.getElementsByClassName('serverSelector')
    e[0].style.height = '70px'
    let v = null
    for (const { name: textContent, filter: y } of data) {
      const Q = document.createElement('span')
      v == null && ((v = Q), v.classList.add('active'))
      Q.textContent = textContent
      type.appendChild(Q)
      type.style.display = ''
      Q.addEventListener('click', () => {
        Q !== v &&
                  (v.classList.remove('active'),
                  (v = Q),
                  v.classList.add('active'))
        l[r] = y
        let X = !0
        for (const C of availableServers) {
          let F = !0
          for (const N of l) F = F && N(C)
          C.element.style.display = F ? '' : 'none'
          X = X && !F
        }
        noServerMatches.style.display = X ? '' : 'none'
      })
    }
  }
  const checkFilter = (h, e) => {
    let check = false
    e.forEach(data => {
      if (data.gameMode == h.gameMode) {
        check = true
      }
    })
    return check
  }
  createFilter(svFilterRegionDoc, [
    { name: 'All', filter: () => !0 },
    {
      name: 'USA',
      filter: (h) => {
        const e = checkFilter(h, global.filters.regions.america)
        return e
      }
    },
    {
      name: 'Europe',
      filter: (h) => {
        const e = checkFilter(h, global.filters.regions.europe)
        return e
      }
    },
    {
      name: 'Asia/Oceania',
      filter: (h) => {
        const e = checkFilter(h, global.filters.regions.asia)
        return e
      }
    },
    {
      name: 'Other',
      filter: (h) => {
        const e = checkFilter(h, global.filters.regions.other)
        return e
      }
    }
  ])
  createFilter(svFilterModeDoc, [
    { name: 'All', filter: () => !0 },
    {
      name: 'FFA',
      filter: (h) => {
        const e = checkFilter(h, global.filters.gamemodeFilters.ffa)
        return e
      }
    },
    {
      name: 'Squads',
      filter: (h) => {
        const e = checkFilter(h, global.filters.gamemodeFilters.squads)
        return e
      }
    },
    {
      name: 'TDM',
      filter: (h) => {
        const e = checkFilter(h, global.filters.gamemodeFilters.tdm)
        return e
      }
    },
    {
      name: 'Minigames',
      filter: (h) => {
        const e = checkFilter(h, global.filters.gamemodeFilters.minigames)
        return e
      }
    },
    {
      name: 'Sandbox',
      filter: (h) => {
        const e = checkFilter(h, global.filters.gamemodeFilters.sandbox)
        return e
      }
    }
  ])
}
