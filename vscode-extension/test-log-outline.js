const assert=require('node:assert/strict');const nav=require('./lib/navigation');const structure=require('./lib/structure');const diag=require('./diagnostics');const fs=require('node:fs');
const text=`<log>
    <?>
        <def:exists("-call")>
            pass
        </d>
    </d>
    <%>
        <def:write("-call",message:str)>
            pass
        </d>
    </d>
    <Parent>"str"</str>
    <Format>
        f"{self.data}"
    </fstr>
    <test>""</str>
    <info>"Useful log"</str>
    <def:main()>
        pass
    </d>
</node>
<record>"Hello"</log(2,"info")>
`;
const all=nav.symbols(text),root=all[0];assert.equal(root.type,'node');assert.deepEqual(all.filter(x=>x.parent===root).map(x=>x.name),['?','%','Parent','Format','test','info','main']);assert.equal(all.find(x=>x.name==='exists').qualified,'log.?.exists');assert.equal(all.find(x=>x.name==='write').qualified,'log.%.write');assert.equal(all.find(x=>x.name==='record').parent,undefined);assert.equal(all.find(x=>x.name==='Format').type,'fstr');assert.deepEqual(structure.check(text),[]);assert.deepEqual(diag.analyse(text,new Set(['log'])),[]);console.log('PASS custom node Outline and multiline scalar structure');
