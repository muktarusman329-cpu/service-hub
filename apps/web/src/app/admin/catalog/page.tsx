"use client";
import { useEffect,useState } from "react";
import { Badge,Card } from "@servicehub/ui/components";
import { AdminGate } from "@/components/admin-gate";
import { ProductShell } from "@/components/product-shell";
import { authFetch } from "@/lib/auth-client";
type Category={id:string;cityId:string;name:string;slug:string;iconKey:string|null;cityEnabled:boolean;services:{id:string;name:string;slug:string;cityEnabled:boolean;priceGuidance:{minPrice:string;maxPrice:string;currency:string;label:string}|null}[]};
export default function CatalogAdminPage(){const [rows,setRows]=useState<Category[]>([]);const [message,setMessage]=useState("Loading catalog…");
 async function load(){try{setRows(await authFetch("/admin/catalog/categories?city=minna"));setMessage("");}catch(e){setMessage(e instanceof Error?e.message:"Could not load catalog.");}}
 useEffect(()=>{void load();},[]);
 async function toggleCategory(c:Category){try{await authFetch(`/admin/catalog/categories/${c.id}/cities`,{method:"PATCH",body:JSON.stringify({cityId:c.cityId,enabled:!c.cityEnabled})});await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not update category.");}}
 async function toggleService(c:Category,s:{id:string;cityEnabled:boolean}){try{await authFetch(`/admin/catalog/services/${s.id}/cities`,{method:"POST",body:JSON.stringify({cityId:c.cityId,enabled:!s.cityEnabled})});await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not update service.");}}
 return <AdminGate><ProductShell audience="Admin"><div className="page-heading"><div><div className="eyebrow">Minna launch setup</div><h1>Service catalog</h1><p className="subtle">Turn categories and services on or off. Price guidance is not a quote.</p></div></div><Card><p role="status">{message}</p>{rows.map(c=><section className="catalog-section" key={c.id}><div className="list-row"><div><h2>{c.name}</h2><p className="subtle">{c.slug} · icon {c.iconKey||"not set"}</p></div><button className="button button-secondary" onClick={()=>void toggleCategory(c)}>{c.cityEnabled?"Turn off":"Turn on"}</button><Badge tone={c.cityEnabled?"success":"warning"}>{c.cityEnabled?"Active in Minna":"Off in Minna"}</Badge></div><div className="list">{c.services.map(s=><div className="list-row" key={s.id}><span>{s.name}{s.priceGuidance&&<small className="subtle"> · ₦{s.priceGuidance.minPrice}–₦{s.priceGuidance.maxPrice} (guide only)</small>}</span><button className="button button-secondary" onClick={()=>void toggleService(c,s)}>{s.cityEnabled?"Turn off":"Turn on"}</button></div>)}</div></section>)}</Card>
 </ProductShell></AdminGate>;}
