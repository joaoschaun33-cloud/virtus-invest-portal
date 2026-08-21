export function parseDelimitedLine(line: string, delimiter = ";") {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      fields.push(current);
      current = "";
    } else current += character;
  }
  fields.push(current);
  return fields;
}
