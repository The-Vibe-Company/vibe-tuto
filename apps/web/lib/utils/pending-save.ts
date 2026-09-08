/** Acknowledge only values sent in this request; later edits remain pending. */
export function acknowledgeSaved<T>(current:Record<string,T>, saved:Record<string,T>):Record<string,T> {
  return Object.fromEntries(Object.entries(current).filter(([id,value]) => !(id in saved) || value !== saved[id]));
}
