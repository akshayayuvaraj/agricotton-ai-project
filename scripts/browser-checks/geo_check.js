const turf = require('../../node_modules/@turf/turf');
(async () => {
  const base='http://localhost:5000/api';
  const login = await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo@agricotton.ai',password:'demo1234'})});
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const get = async p => (await fetch(base+p,{headers:{cookie}})).json();
  const fields=(await get('/fields')).fields, zones=(await get('/zones')).zones;
  const f=fields.find(x=>x.name==='E2E Location Field'); const zs=zones.filter(z=>z.fieldId===f.id);
  const ff=turf.feature(f.boundary); const fa=turf.area(ff);
  let ok=true, total=0, ids=new Set(zs.map(z=>z.id));
  zs.forEach(z=>{const zf=turf.feature(z.polygon); const inter=turf.intersect(zf,ff); const za=turf.area(zf); total+=za;
    const inside=inter && Math.abs(turf.area(inter)-za)<1; const kinks=turf.kinks(zf).features.length;
    if(!inside||kinks) ok=false; console.log(z.name,'inside:',inside,'kinks:',kinks,'area m2:',za.toFixed(0));});
  let overlap=0; for(let i=0;i<zs.length;i++)for(let j=i+1;j<zs.length;j++){const o=turf.intersect(turf.feature(zs[i].polygon),turf.feature(zs[j].polygon)); if(o) overlap+=turf.area(o);}
  console.log('zones:',zs.length,'unique ids:',ids.size,'field m2:',fa.toFixed(0),'zones total m2:',total.toFixed(0),'pairwise overlap m2:',overlap.toFixed(2));
  console.log(ok && overlap<1 && ids.size===zs.length && Math.abs(fa-total)/fa<0.005 ? 'GEOMETRY OK':'GEOMETRY BAD');
})();
