self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("push",event=>{
 let data={};try{data=event.data?event.data.json():{}}catch(_){}
 event.waitUntil(self.registration.showNotification(data.title||"DATA CENTER",{body:data.body||"New system activity requires your attention.",icon:"/data-center.svg",badge:"/data-center.svg",tag:data.tag||"data-center",renotify:true,vibrate:[200,100,200],data:{url:data.url||"/"}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||"/",self.location.origin).href;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const client of windows){if(client.url.startsWith(self.location.origin)&&"focus" in client){await client.focus();if("navigate" in client)await client.navigate(target);return;}}await self.clients.openWindow(target);})());
});
