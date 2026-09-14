// Test-server-only provider fixture. A real OpenAI request must never leave tests.
if (process.env.OPENAI_API_KEY !== "duckies-test-ai-intercepted" || !/^\/duckies_test(?:_[a-z0-9_]+)?$/.test(new URL(process.env.DUCKIES_DATABASE_URL).pathname)) {
  throw new Error("AI interception is restricted to the Duckies test database.");
}
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
  if(String(input).startsWith("https://api.openai.com/")) {
    if(String(input)!=="https://api.openai.com/v1/responses") throw new Error("Unexpected provider endpoint");
    const body=JSON.parse(init.body);
    if(body.store!==false||body.text?.format?.type!=="json_schema") throw new Error("Provider privacy/schema contract missing");
    const data=JSON.parse(body.input[1].content);
    if(data.brief==="fixture-provider-failure") return Response.json({error:{message:"secret provider details"}},{status:401});
    if(data.brief==="fixture-incomplete") return Response.json({status:"incomplete",output:[]});
    if(data.brief==="fixture-refusal") return Response.json({status:"completed",output:[{type:"message",content:[{type:"refusal",refusal:"Cannot answer"}]}]});
    const changes=data.brief==="fixture-invalid-id"?[{ingredientId:"unknown",mixGrams:100}]:data.brief==="fixture-empty-mix"?data.recipe.ingredients.map(i=>({ingredientId:i.id,mixGrams:0})):[{ingredientId:"honey",mixGrams:30},{ingredientId:"oats",mixGrams:195}];
    const advice={summary:"A small change to test the sweetness and crunch.",suggestions:[{title:"A little less honey",reason:"Reduce sweetness while keeping the existing ingredients.",tradeoff:"Check whether the clusters still hold together.",changes}],nextSteps:["Measure the cinnamon and salt separately."]};
    return Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:data.brief==="fixture-malformed"?"{}":JSON.stringify(advice)}]}]});
  }
  return originalFetch(input,init);
};
