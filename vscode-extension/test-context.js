const assert=require('node:assert/strict');const c=require('./context');
const text=`<def:Outer()>
    <def:person(name:str!{The name, please.},age:[int,float])> !<-- Show info.
"""
**Long description**
<def:Fake()>
"""
    </d>
</d>
Outer.person(userage=age,username=name)`;
const ds=c.definitions(text);assert.equal(ds.length,2);const d=ds[1];assert.equal(d.qualified,'Outer.person');assert.equal(d.summary,'Show info.');assert.equal(d.params.length,2);assert.equal(d.params[0].description,'The name, please.');assert.equal(d.params[1].type,'[int,float]');assert.ok(d.documentation.includes('**Long description**'));
const call=c.callAt(text,text.lastIndexOf(')'));assert.equal(call.name,'Outer.person');assert.equal(call.index,1);assert.equal(call.args[1],'username=name');
assert.deepEqual(c.splitTop('"Hello, world", foo(1|2), age'),['"Hello, world"','foo(1|2)','age']);
console.log('NCS editor context tests passed');
