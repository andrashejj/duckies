import type { APIRoute } from "astro";
export const prerender=false;
const templates=import.meta.glob<string>("../../private/branding/brand-*.html",{query:"?raw",import:"default",eager:true});
export const GET:APIRoute=async({params,locals})=>{
 if(!locals.branding?.canView)return new Response("Branding approval required.",{status:403});
 const content=templates[`../../private/branding/${params.name}.html`];
 return content?new Response(content,{headers:{"Content-Type":"text/html; charset=utf-8"}}):new Response("Not found",{status:404});
};
