# Learning Automation Manifesto

## 1. Understanding Criteria
We define "Understanding" not as reading, but as the ability to:
1. **Reconstruct**: Can you rebuild the idea from its components?
2. **Judge**: Can you make the right trade-off decision in a vague scenario?
3. **Infer**: Can you predict the output of a system given an input?
4. **Trace**: Can you point to the exact source of your knowledge?

## 2. Rules of Engagement
- **Meaning-based Chunking**: Documents should be split by concept, not by file size.
- **Context Cards**: Every doc must have a standard metadata header (Frontmatter).
- **Learn vs Execute**: 
  - `Concept` docs teach you *how to think*.
  - `Reference` docs teach you *what to type*.
  - `Judgment` docs teach you *what to choose*.
  - Do not mix them.

## 3. Versioning Policy
- **Semantic Versioning**: 1.0.0 (Concept change), 1.1.0 (Clarification), 1.0.1 (Typo).
- **Change Log**: Every automated system relies on these docs. 
- **Immutable History**: Do not delete old logic if it's still in production use; mark as Deprecated.

## 4. The Gold Set
- The `docs/learning/` directory is the **Gold Set**.
- It is the only source of truth for RAG and automated reasoning.
- If it's not in the Gold Set, the Agent "does not know it".
