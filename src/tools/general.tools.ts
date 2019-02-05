export async function asyncForEach(array: any[], callback: (...args: any[]) => Promise<any>) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
