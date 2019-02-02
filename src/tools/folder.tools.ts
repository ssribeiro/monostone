import { lstatSync, readdirSync } from 'fs';
import { join } from 'path';
import { lastNameOfFilePath, firstNameOfFile, firstNameOfFileSeparatedBySlashes } from './string.tools';

export function isDirectory (source: string) {
  return lstatSync(source).isDirectory();
}

export function getDirectories(source: string) {
  return readdirSync(source).map((name: string) => join(source, name)).filter(isDirectory);
}

export function getFiles(source: string) {
  return readdirSync(source).map((name: string) => join(source, name)).filter(source => !isDirectory(source));
}

export { lastNameOfFilePath, firstNameOfFile, firstNameOfFileSeparatedBySlashes };
