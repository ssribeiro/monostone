export function lastNameOfFilePath(filePath: string): string {
  return filePath.replace(/^.*[\\\/]/, "");
}
