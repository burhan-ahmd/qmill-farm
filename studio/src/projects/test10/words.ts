export type Card={a:number;b:number;w:string};
export const CARDS:Card[]=[{a:0,b:14,w:"The"},{a:14,b:38,w:"Eiffel"},{a:38,b:59,w:"Tower"},{a:59,b:75,w:"was"},{a:75,b:105,w:"sold"},{a:105,b:135,w:"for"},{a:135,b:174,w:"scrap."},{a:174,b:210,w:"Twice."},{a:210,b:230,w:"A"},{a:230,b:250,w:"second"},{a:250,b:275,w:"buyer"},{a:275,b:300,w:"bids."}];
export const cardAt=(f:number)=>Math.max(0,CARDS.findIndex(c=>f>=c.a&&f<c.b));
