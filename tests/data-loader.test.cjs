const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DataLoader,LOAD_TIMEOUT_MS}=require('../.core-build/core/dataLoader.js');
class Clock {
 now=0; id=0; jobs=new Map();
 set=(fn,delay)=>{const id=++this.id;this.jobs.set(id,{fn,at:this.now+delay});return id;};
 clear=id=>this.jobs.delete(id);
 tick(ms){const end=this.now+ms;let guard=0;for(;;){const next=[...this.jobs].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;if(++guard>100)throw Error('Possible request loop');this.now=next[1].at;this.jobs.delete(next[0]);next[1].fn();}this.now=end;}
}
function setup(request){const clock=new Clock(),failures=[];let calls=0;const loader=new DataLoader(()=>{calls++;return request?request(loader,clock):true;},r=>failures.push(r),clock);return {loader,clock,failures,calls:()=>calls};}
test('No fetch for an already complete candidate view',()=>{const s=setup();s.loader.receive(12,true);s.clock.tick(50000);assert.equal(s.calls(),0);});
test('Fetch is deferred outside the host update',()=>{const s=setup();s.loader.receive(3,false);assert.equal(s.calls(),0);s.clock.tick(0);assert.equal(s.calls(),1);assert.equal(s.loader.isPending,true);});
test('Incomplete accepted fetch times out and offers explicit retry',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(LOAD_TIMEOUT_MS);assert.deepEqual(s.failures,['timeout']);assert.equal(s.loader.canRetry,true);assert.equal(s.loader.isPending,false);});
test('Timeout does not automatically loop or refetch',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(120000);assert.equal(s.calls(),1);assert.equal(s.failures.length,1);});
test('Manual retry issues one fresh request and successful data clears error',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(LOAD_TIMEOUT_MS);assert.equal(s.loader.retry(),true);assert.equal(s.loader.retry(),false);s.clock.tick(0);assert.equal(s.calls(),2);s.loader.receive(12,true);s.clock.tick(60000);assert.equal(s.loader.canRetry,false);assert.deepEqual(s.failures,['timeout']);});
test('Host refusal cancels the timeout and exposes retry',()=>{const s=setup(()=>false);s.loader.receive(3,false);s.clock.tick(60000);assert.deepEqual(s.failures,['refused']);assert.equal(s.loader.canRetry,true);});
test('Host exception cancels the timeout and exposes retry',()=>{const s=setup(()=>{throw Error('host');});s.loader.receive(3,false);s.clock.tick(60000);assert.deepEqual(s.failures,['request-error']);});
test('Synchronous complete response does not leave a watchdog running',()=>{const s=setup(loader=>{loader.receive(12,true);return true;});s.loader.receive(3,false);s.clock.tick(60000);assert.equal(s.calls(),1);assert.deepEqual(s.failures,[]);assert.equal(s.loader.isPending,false);});
test('Synchronous chained aggregated segments finish without duplicated requests',()=>{let size=3;const s=setup(loader=>{size+=3;loader.receive(size,size===12);return true;});s.loader.receive(3,false);s.clock.tick(60000);assert.equal(s.calls(),3);assert.deepEqual(s.failures,[]);});
test('An incomplete repeated segment fails closed instead of spinning',()=>{const s=setup(loader=>{loader.receive(3,false);return true;});s.loader.receive(3,false);s.clock.tick(60000);assert.equal(s.calls(),1);assert.deepEqual(s.failures,['no-progress']);});
test('A shrinking Append segment is not used as a complete universe',()=>{const s=setup();s.loader.receive(6,false);s.clock.tick(0);s.loader.receive(3,false);assert.deepEqual(s.failures,['no-progress']);});
test('A host Create notification starts a genuinely new context',()=>{const s=setup();s.loader.receive(6,false);s.clock.tick(0);s.loader.receive(3,false,true);s.clock.tick(0);assert.equal(s.calls(),2);assert.deepEqual(s.failures,[]);});
test('New data cancels the previous watchdog deadline',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(20000);s.loader.receive(6,false);s.clock.tick(20000);assert.deepEqual(s.failures,[]);s.loader.receive(12,true);s.clock.tick(60000);assert.deepEqual(s.failures,[]);});
test('Reset cancels a queued fetch before it reaches the host',()=>{const s=setup();s.loader.receive(3,false);s.loader.reset();s.clock.tick(60000);assert.equal(s.calls(),0);assert.equal(s.loader.canRetry,false);});
test('Reset cancels an accepted fetch watchdog',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(0);s.loader.reset();s.clock.tick(60000);assert.deepEqual(s.failures,[]);});
test('Dispose prevents retries and future data requests',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(LOAD_TIMEOUT_MS);s.loader.dispose();assert.equal(s.loader.retry(),false);s.loader.receive(3,false);s.clock.tick(60000);assert.equal(s.calls(),1);});
test('Two loader instances keep their timers and errors separate',()=>{const a=setup(),b=setup();a.loader.receive(3,false);b.loader.receive(3,false);a.clock.tick(LOAD_TIMEOUT_MS);b.clock.tick(0);b.loader.receive(12,true);assert.equal(a.loader.canRetry,true);assert.equal(b.loader.canRetry,false);assert.deepEqual(b.failures,[]);});
test('Invalid row counts cannot schedule host requests',()=>{const s=setup();for(const x of [-1,1.5,NaN,Infinity])assert.throws(()=>s.loader.receive(x,false));assert.equal(s.calls(),0);});
test('Retry is unavailable without an incomplete failed load',()=>{const s=setup();assert.equal(s.loader.retry(),false);s.loader.receive(3,false);assert.equal(s.loader.retry(),false);});
test('A late complete response recovers a timed-out loader without a refetch',()=>{const s=setup();s.loader.receive(3,false);s.clock.tick(LOAD_TIMEOUT_MS);s.loader.receive(12,true);assert.equal(s.loader.canRetry,false);assert.equal(s.calls(),1);});
