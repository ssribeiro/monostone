export function lastNameOfFilePath(filePath: string): string {
  return filePath.replace(/^.*[\\\/]/, "");
}

export function firstNameOfFile(filePath: string): string {
  return nameWithoutNonAlphabetical(
    nameUntilFirstDot(
      lastNameOfFilePath(filePath).replace(/^.*[\\\/]/, "")
    )
  ).toLowerCase();
}

export function firstNameOfFileSeparatedBySlashes(filePath: string): string {
  return nameUntilFirstDot(
    lastNameOfFilePath(filePath).replace(/^.*[\\\/]/, "")
  ).toLowerCase();
}

export function nameUntilFirstDot(name: string): string {
  return name.substr(0, name.indexOf('.'));
}

export function nameWithoutNonAlphabetical(name: string): string {
  return name.replace( /[^a-zA-Z]/, "");
}

export const filters = {
  lastCharactersMustBe: (testingCharacters: string) => {
    return (testingString: string) => {
      return testingString.substr( testingString.length - testingCharacters.length, testingString.length ) == testingCharacters;
    };
  },
};
