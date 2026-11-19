// Snippet templates use VS Code placeholder syntax. These are not NCS escape syntax.
const nodes=[
 ['Node (unsigned)','<${1:node}>"${2:data}"</>$0','Basic named node. Choose its signature manually.'],
 ['Empty node (unsigned)','<${1:node}></>$0','Named node without data or signature.'],
 ['Function','<def:${1:name}(${2:value})>\n\t${3:pass}\n</d>$0','Definition with temporary parameters.'],
 ['Documented function','<def:${1:name}(${2:value}:${3:str}!{${4:Parameter description}\\})> !<-- ${5:Short summary}\n"""\n${6:Markdown description}\n"""\n\t${7:pass}\n</d>$0','Typed parameters and documentation.'],
 ['Print','<print(${1:"Hello"})/p>$0','Print a value.'],
 ['Print f-string','<print(f"${1:Hello}, {${2:name}}")/p>$0','Print interpolated text.'],
 ['Input','<${1:name}><input("${2:Please input a value: }")/ip></${3:str}>$0','Read terminal input into a node.'],
 ['List','<${1:items}>[${2:1|2|3}]</list[${3:int}](${4:3})>$0','Persistent list with a declared length.'],
 ['Dictionary','<${1:Dictionary}>\n\t<${2:Apple}>"${3:Value}"</str>\n</dict[${4:str}](${5:1})>$0','Named child nodes.'],
 ['Immutable node','<${1:name}>${2:42}</${3:int}&immut>$0','Value protection, without forced conversion restrictions.'],
 ['Custom mode schema','<${1:my_mode}>\n\t<?>\n\t</d>\n\t<%>\n\t</d>\n\t<Parent>"${2:dict}"</str>\n\t<Format>f""</fstr>\n\t<test>""</str>\n\t<info>"${3:Description}"</str>\n\t<def:main()>\n\t</d>\n</node>$0','Stage 6 metadata schema; executable handlers are planned.'],
 ['Forced node','<${1:name}>${2:42}</\\$${3:int}>$0','Protected signature.'],
 ['If','<if|${1:true}>\n\t${2:pass}\n</if>$0','Conditional block.'],
 ['If / else','<if|${1:true}>\n\t${2:pass}\n<else>\n\t${3:pass}\n</if>$0','Conditional block with fallback.'],
 ['Elif','<elif|${1:true}>\n\t${2:pass}$0','Add an alternate condition inside an existing if block.'],
 ['Else','<else>\n\t${1:pass}$0','Add a fallback branch inside an existing if block.'],
 ['Case','|case|(${1:"example"}):\n\t${2:pass}$0','Add a case inside an existing match; update the declared case count.'],
 ['Default case','|case|_:\n\t${1:pass}$0','Default case inside a match.'],
 ['For','<for|${1:item}|in|${2:range(0|5)}>\n\t${3:pass}\n</loop>$0','Loop over a sequence.'],
 ['While','<while|${1:true}>\n\t${2:break()}\n</loop>$0','Repeat while a condition is true.'],
 ['Match','<match(${1:value}):\n\t|case|(${2:"example"}):\n\t\t${3:pass}\n\t|case|_:\n\t\t${4:pass}\n/2|match>$0','Match a value with a required default.'],
 ['Try / catch','<try:\n\t|${1:pass}|\n\t|<catch(${2:error}): |${3:pass}|/try>|\n/try>$0','Handle errors and warnings.'],
 ['Throw','<throw(${1:warn}): |\'${2:Something happened.}\'|/try>$0','Emit a warning, message or error.'],
 ['Catch','<catch(${1:warn}): |${2:pass}|/try>$0','Handle a matching throw inside try.']
];
const comments=[['Endline comment','!<-- ${1:Comment}$0','Green comment to the end of the line.'],['Inline comment','!{${1:Comment}}$0','Green inline comment.'],['Multiline comment','"""\n${1:Markdown description}\n"""$0','Orange multiline documentation.']];
module.exports={nodes,comments};
