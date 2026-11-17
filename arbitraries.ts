import fc from "fast-check";
import type { PrimeCode } from "../../src/validation/prime-code";

export const finiteDoubleArb = fc.double({ noNaN: true, noDefaultInfinity: true });
export const vertexArb = fc.string({ minLength: 1, maxLength: 12 });
export const smallPrimeArb = fc.constantFrom(2,3,5,7,11,13,17,19,23,29);
export const roleArb = fc.constantFrom(1,2);

export const validTriangleArb = fc.uniqueArray(vertexArb,{minLength:3,maxLength:3}).map(([a,b,c]) => ({ vertices:[a,b,c], edges:[[a,b],[b,c],[c,a]] as const }));

export const validPrimeCodeArb = fc.uniqueArray(smallPrimeArb,{minLength:1,maxLength:8}).chain(primes =>
  fc.array(roleArb,{minLength:primes.length,maxLength:primes.length}).map(roles => {
    let composite=1n; const mapping=new Map<number,number>();
    primes.forEach((p,i)=>{ composite*=BigInt(p)**BigInt(roles[i]); mapping.set(i,p); });
    return {composite,primes,roles,mapping} satisfies PrimeCode;
  })
);
