export interface NewickNode {
  readonly name?: string;
  readonly length?: number;
  readonly children?: readonly NewickNode[];
}

function parseLabel(input: string, index: number): { readonly value: string; readonly next: number } {
  let i = index;
  let value = '';
  while (i < input.length && !['(', ')', ',', ':', ';'].includes(input[i]!)) {
    value += input[i]!;
    i++;
  }
  return { value: value.trim(), next: i };
}

function parseLength(input: string, index: number): { readonly value?: number; readonly next: number } {
  if (input[index] !== ':') {
    return { next: index };
  }
  const label = parseLabel(input, index + 1);
  const value = Number(label.value);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid Newick branch length: ${label.value}`);
  }
  return { value, next: label.next };
}

const MAX_NEWICK_DEPTH = 5_000;

function parseNode(
  input: string,
  index: number,
  depth = 0,
): { readonly node: NewickNode; readonly next: number } {
  if (depth > MAX_NEWICK_DEPTH) {
    throw new Error(`Newick tree exceeds maximum nesting depth (${MAX_NEWICK_DEPTH})`);
  }
  if (input[index] === '(') {
    let i = index + 1;
    const children: NewickNode[] = [];
    while (i < input.length && input[i] !== ')') {
      const child = parseNode(input, i, depth + 1);
      children.push(child.node);
      i = child.next;
      if (input[i] === ',') i++;
    }

    if (input[i] !== ')') {
      throw new Error('Unbalanced Newick tree: missing closing parenthesis');
    }

    const label = parseLabel(input, i + 1);
    const length = parseLength(input, label.next);
    return {
      node: {
        children,
        name: label.value || undefined,
        length: length.value,
      },
      next: length.next,
    };
  }

  const label = parseLabel(input, index);
  const length = parseLength(input, label.next);
  return {
    node: {
      name: label.value || undefined,
      length: length.value,
    },
    next: length.next,
  };
}

/** Parse a guide-tree Newick string. */
export function parseNewick(content: string): NewickNode {
  const trimmed = content.trim();
  if (!trimmed.endsWith(';')) {
    throw new Error('Invalid Newick: missing terminating semicolon');
  }

  const tree = parseNode(trimmed, 0);
  if (trimmed[tree.next] !== ';') {
    throw new Error('Invalid Newick: trailing content before semicolon');
  }
  return tree.node;
}