let mode
let channel
let mapCanvas, shadowCanvas, ctx, dims, cellSize=50, pawnContainer, currentPawn
let unshadows, unshadowRectRadius=10


let containers={
  stp:document.querySelector(".setup.space"),
  dm:document.querySelector(".dm.space"),
  ply:document.querySelector(".player.space")
}

let dmData={
  mapName:undefined,
  shadowFill:"#00000060",
  shadowBorderFill:"#00000030",
  drawingUnshadows:false,
  isDraggingUnshadows:false,
  currentUnshadow:undefined,

  isDraggingPawn:false,
  currentPawn:undefined,
}

let plyData={
  shadowFill:"#000000",
  shadowBorderFill:"#000000a8",
}

setup()

function setup(){
  channel=new BroadcastChannel("canale-diendi")

  if(location.search.includes("player")) switchSpace("ply")
}

function openPlayer(){
  window.open(`${location.pathname}?player`,"_blank")
  switchSpace("dm")
}

function switchSpace(type){
  containers.stp.classList.remove("visible")
  containers.dm.classList.remove("visible")
  containers.ply.classList.remove("visible")

  if(type=="ply"){
    containers.ply.classList.add("visible")
    setupPLY()
  }else if(type=="dm"){
    containers.dm.classList.add("visible")
    setupDM()
  }
}


//DM
async function setupDM(){
  mode="dm"
  channel.postMessage({
    type:"handshaking",
    origin:mode
  })

  unshadows=[]

  let settings=await fetch("./settings.json").then(res=>res.json())

  cellSize=settings.cellSize

  containers.dm.innerHTML=""
  let savedGames=[]
  for(let m of settings.maps){
    let mapElement=document.createElement("div")
    mapElement.classList.add("map-element")
    mapElement.addEventListener("click",()=>{setupMapDM(m,settings)})
    mapElement.innerHTML=`NEW: ${m.filename}`
    containers.dm.append(mapElement)
    
    let saved=localStorage.getItem(m.filename)
    if(saved) savedGames.push(JSON.parse(saved))
  }

  for(let s of savedGames){
    let mapElement=document.createElement("div")
    mapElement.classList.add("map-element")
    mapElement.addEventListener("click",async ()=>{
      await setupMapDM({filename:s.mapName},settings)
      loadGame(s.mapName)
      saveGame()
    })
    mapElement.innerHTML=`LOAD: ${s.mapName}`
    containers.dm.append(mapElement)

  }

  // if(settings.maps.length==1) setupMapDM(settings.maps[0],settings)
}

async function setupMapDM(map,settings){
  dmData.mapName=map.filename
  dmData.drawingUnshadows=false

  containers.dm.innerHTML=""
  let template=document.getElementById("dm-map")
  let clone=template.content.cloneNode(true)
  containers.dm.appendChild(clone)

  mapCanvas=containers.dm.querySelector("canvas.map")
  shadowCanvas=containers.dm.querySelector("canvas.shadow")
  
  createAddButtons(settings.pawns)

  pawnContainer=containers.dm.querySelector(".pawns")
  setupPawnListeners()

  setupScrollListener()

  let img=new Image()
  img.addEventListener("load",()=>{
    dims=[img.width, img.height]
    mapCanvas.width=dims[0]
    mapCanvas.height=dims[1]

    ctx=mapCanvas.getContext("2d")
    ctx.drawImage(img,0,0)

    shadowCanvas.width=dims[0]
    shadowCanvas.height=dims[1]

    pawnContainer.width=`${dims[0]}px`
    pawnContainer.height=`${dims[1]}px`

    setupShadow()
  })
  img.src=`./assets/${map.filename}`

  channel.postMessage({type:"setup",filename:map.filename,cellSize:cellSize})
}

function setupScrollListener(){
  containers.dm.addEventListener("scroll",ev=>{
    channel.postMessage({type:"scroll",scroll:[ev.target.scrollLeft,ev.target.scrollTop]})
  })
}

function createAddButtons(pawns){
  const container=containers.dm.querySelector(".pawn-buttons")
  for(let p of pawns){
    let btn=document.createElement("div")
    btn.classList.add("add-button")
    btn.style.backgroundImage=`url("./assets/${p.image}")`
    btn.addEventListener("click",(ev)=>{
      addPawn(ev.target.offsetLeft,ev.target.offsetTop+50,p.kind,p.image)
    })
    container.append(btn)
  }
}

function loadGame(save){
  const data=JSON.parse(localStorage.getItem(save))
  console.log("LOAD")
  console.log(data)
  cellSize=data.cellSize
  dmData.mapName=data.mapName
  unshadows=data.unshadows
  for(let p of data.pawns) addPawn(p.x,p.y,p.kind,p.image)
  transferUnshadows()
  transferPawns()
  drawUnshadows()
}
function saveGame(){
  const data={
    mapName:dmData.mapName,
    unshadows:unshadows,
    cellSize:cellSize,
    pawns:[]
  }
  for(let p of pawnContainer.querySelectorAll(".pawn")){
    let rect=p.getBoundingClientRect()
    data.pawns.push({
      x:rect.x,
      y:rect.y,
      kind:p.dataset.kind,
      image:p.dataset.image
    })
  }
  console.log("SAVE")
  console.log(data)
  localStorage.setItem(dmData.mapName,JSON.stringify(data))
}

//shadows
function toggleShadow(ev){
  dmData.drawingUnshadows=!dmData.drawingUnshadows
  if(dmData.drawingUnshadows){
    ev.target.classList.add("selected")
    dmData.isDraggingUnshadows=false
    dmData.currentUnshadow=undefined
    shadowCanvas.addEventListener("mousedown",startDrawingUnshadows)
    pawnContainer.classList.add("deactivated")
  }else{
    ev.target.classList.remove("selected")
    shadowCanvas.removeEventListener("mousedown",startDrawingUnshadows)
    pawnContainer.classList.remove("deactivated")
  }
}

function startDrawingUnshadows(ev){
  if(!dmData.isDraggingUnshadows){
    dmData.isDraggingUnshadows=true
    let x=ev.clientX
    let y=ev.clientY
    dmData.currentUnshadow=[x,y,0,0]

    shadowCanvas.addEventListener("mousemove",dragUnshadow)
    shadowCanvas.addEventListener("mouseup",stopDrawingUnshadow)
  }

}

function dragUnshadow(ev){{
  if(dmData.isDraggingUnshadows){
    let x=ev.clientX
    let y=ev.clientY
    dmData.currentUnshadow=[
      dmData.currentUnshadow[0],
      dmData.currentUnshadow[1],
      x-dmData.currentUnshadow[0],
      y-dmData.currentUnshadow[1]
    ]

    drawUnshadows()
  }
}}

function stopDrawingUnshadow(ev){
  if(dmData.currentUnshadow){
    unshadows.push(dmData.currentUnshadow)
  }
  dmData.isDraggingUnshadows=false
  dmData.currentUnshadow=undefined
  // shadowCanvas.removeEventListener("mousedown",startDrawingUnshadows)
  shadowCanvas.removeEventListener("mousemove",dragUnshadow)
  shadowCanvas.removeEventListener("mouseup",stopDrawingUnshadow)

  transferUnshadows()
  drawUnshadows()
}

//pawns
function addPawn(x,y,kind,image=""){
  const pawn=document.createElement("div")
  pawn.classList.add("pawn")
  pawn.style.left=`${x}px`
  pawn.style.top=`${y}px`
  pawn.style.width=`${cellSize}px`
  pawn.style.height=`${cellSize}px`
  if(image) pawn.style.backgroundImage=`url("./assets/${image}")`
  pawn.setAttribute("data-kind",kind)
  pawn.setAttribute("data-image",image)
  pawn.style.backgroundColor=kind
  pawnContainer.append(pawn)

  transferPawns()
}
function setupPawnListeners(){
  currentPawn=undefined
  pawnContainer.addEventListener("mousedown",async ev=>{
    if(ev.target && ev.target.classList.contains("pawn") && !document.pointerLockElement){
      await ev.target.requestPointerLock()
      pawnContainer.addEventListener("mousemove",dragPawn)
      pawnContainer.addEventListener("mouseup",stopDraggingPawn)
    }
  })
}
function dragPawn(ev){
  if(document.pointerLockElement){
    document.pointerLockElement.style.left=`${document.pointerLockElement.offsetLeft+ev.movementX}px`
    document.pointerLockElement.style.top=`${document.pointerLockElement.offsetTop+ev.movementY}px`
    transferPawns()
  }else stopDraggingPawn()
}
function stopDraggingPawn(){
  document.exitPointerLock()
  pawnContainer.removeEventListener("mousemove",dragPawn)
  pawnContainer.removeEventListener("mouseup",stopDraggingPawn)
  transferPawns()
}

//PLY
function setupPLY(){
  mode="ply"
  channel.postMessage({
    type:"handshaking",
    origin:mode
  })

  unshadows=[]

  channel.onmessage=(ev)=>{
    switch(ev.data.type){
      case "setup":
        cellSize=ev.data.cellSize
        setupMapPLY(ev.data.filename)
        break
      case "unshadows":
        unshadows=ev.data.unshadows
        drawUnshadows()
      case "scroll":
        containers.ply.scrollLeft=ev.data.scroll[0]
        containers.ply.scrollTop=ev.data.scroll[1]
        break
      case "pawns":
        updatePawns(ev.data.pawns)
      default: break
    }
  }
}

async function setupMapPLY(filename){
  containers.ply.innerHTML=""
  let template=document.getElementById("ply-map")
  let clone=template.content.cloneNode(true)
  containers.ply.appendChild(clone)

  mapCanvas=containers.ply.querySelector("canvas.map")
  shadowCanvas=containers.ply.querySelector("canvas.shadow")
  
  pawnContainer=containers.ply.querySelector(".pawns")

  let img=new Image()
  img.addEventListener("load",()=>{
    dims=[img.width, img.height]
    mapCanvas.width=dims[0]
    mapCanvas.height=dims[1]

    ctx=mapCanvas.getContext("2d")
    ctx.drawImage(img,0,0)

    shadowCanvas.width=dims[0]
    shadowCanvas.height=dims[1]

    pawnContainer.width=`${dims[0]}px`
    pawnContainer.height=`${dims[1]}px`

    setupShadow()
  })
  img.src=`./assets/${filename}`
}

function updatePawns(pawns=[]){
  if(pawnContainer){
    pawnContainer.innerHTML=""
    for(let p of pawns){
      let pawn=document.createElement("div")
      pawn.classList.add("pawn")
      pawn.style.left=`${p.x}px`
      pawn.style.top=`${p.y}px`
      pawn.style.width=`${cellSize}px`
      pawn.style.height=`${cellSize}px`
      pawn.style.backgroundImage=p.image
      pawn.setAttribute("data-kind",p.kind)
      pawnContainer.append(pawn)
    }
  }
}


//BOTH
function transferPawns(){
  if(mode=="dm"){
    const transferablePawns=[]
    for(let p of pawnContainer.querySelectorAll(".pawn")){
      let rect=p.getBoundingClientRect()
      transferablePawns.push({
        x:rect.x,
        y:rect.y,
        kind:p.dataset.kind,
        image:p.style.backgroundImage
      })
    }
    channel.postMessage({type:"pawns",pawns:[...transferablePawns]})
    saveGame()
  }
}

function transferUnshadows(){
  if(mode=="dm"){
    channel.postMessage({type:"unshadows",unshadows:[...unshadows]})
    saveGame()
  }
}
function setupShadow(){
  ctx=shadowCanvas.getContext("2d")
  ctx.clearRect(0,0,...dims)

  ctx.fillStyle=mode=="dm"?dmData.shadowFill:plyData.shadowFill
  ctx.fillRect(0,0,...dims)

  transferUnshadows()
  drawUnshadows()
}

function drawUnshadows(){
  if(ctx){
    ctx.clearRect(0,0,...dims)

    ctx.fillStyle=mode=="dm"?dmData.shadowFill:plyData.shadowFill
    ctx.fillRect(0,0,...dims)

    for(let un of unshadows){
      ctx.clearRect(...un)
      // ctx.fillStyle=mode=="dm"?dmData.shadowBorderFill:plyData.shadowBorderFill
      // ctx.fillRect(...un)
      // ctx.clearRect(
      //   un[0]+unshadowRectRadius, un[1]+unshadowRectRadius,
      //   un[2]-2*unshadowRectRadius, un[3]-2*unshadowRectRadius,
      // )
    }
    if(mode=="dm" && dmData.currentUnshadow){
      ctx.strokeStyle="lime"
      ctx.strokeRect(...dmData.currentUnshadow)
    }
  }
}




