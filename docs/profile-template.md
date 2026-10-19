# Toolkit profile: collection brief for an agent

You are filling in a **profile** for the Toolkit Bricks viewer. A profile is one JSON file that describes the AI and automation tools a team or company owns, the infrastructure they run on, and how they connect. The viewer imports it as `catalog.json`.

Your only deliverable is **one valid JSON file** that follows schema version `1.3` (below). Do not return prose around it.

## 1. Inputs (filled in by the requester)

- Profile name: `<e.g. Engineering department>`
- Owner / contact: `<team or person>`
- Scope: `<which teams, systems or environments are covered>`
- Language of all texts: `<en>`
- Sources you may use: `<interviews, internal wiki, software portal, admin consoles, repos, vendor docs>`
- Out of scope: `<anything to leave out>`
- Output file name: `profile-<short-name>.json` (real profiles go to `profiles/private/` and are never committed)

## 2. Vocabulary

| Term | Meaning | Example |
|---|---|---|
| **Brick** | A tool the company owns or plans to own. | GitHub Copilot, n8n, Playwright MCP, Microsoft Edge |
| **Stud** | A connection type. A brick *offers* some studs and *accepts* others. | `mcp`, `browser`, `workflow` |
| **Platform** | Infrastructure a brick or another platform runs on. | VS Code, Node.js, Python, Windows/macOS/Linux, Docker |
| **Recipe** | A tested combination of bricks that achieves a result. The viewer calls it a **use case** and gives it its own page. | Browser checks without test code |
| **Research** | What was checked, when, and where it came from: facts with a source link, open points with an owner, sources. | "Edge does not run on Chromebooks" with a link |

**Connection rule.** Brick A uses brick B when A `accepts` a stud that B `provides`. Cables are drawn from A (user) to B (provider).

**Infrastructure rule.** `runsOn` lists **alternatives**: one is enough (Node.js *or* Python). `runsOn` can name platforms or other bricks (VS Code runs on a desktop OS, pgvector runs inside PostgreSQL). `requires` lists things that are **all** needed. Together they have no cycles.

**Wording in the viewer.** Something running in a brick or in a platform with `kind: "host-app"` reads "running inside" (Copilot inside VS Code, pgvector inside PostgreSQL); `requires` reads "needs". Everything else reads "running on" (Playwright MCP on Node.js, Edge on the desktop OS).

## 3. What to collect

### For every brick
1. `id`, `name`, `category`, `status` (`available` = set up and usable, `planned` = on the roadmap, `restricted` = owned but needs approval).
2. `summary`: one line, what is this.
3. `why`: the value for the business, in plain language. A manager must understand it.
4. `what`: what it is and does. Include versions or requirements only if you verified them.
5. `how`: ordered steps for installation and first use, as the company actually does it.
6. `difficulty`: two ratings, `installation` and `usage`, each with `stars` and a `why` (see section 5).
7. `provides` and `accepts`: the studs. Create a new stud only when no existing one fits.
8. `runsOn` and `requires`: platforms or bricks it runs on (alternatives) and ones it also needs (all). Leave out if unknown.
9. `research`: facts you checked for this brick, each with a source link, and open points (see Research below).
9. `links`: official documentation or internal pages (https only).

### For every platform a brick needs
`id`, `label`, `kind`, `summary`. Add `why`, `what`, `how`, `difficulty` where useful. Add `variants` for concrete flavours (Windows, macOS, Linux). Add `runsOn` for what it sits on. Only claim operating systems and versions you verified in vendor documentation.

### Research
A `research` block has `verifiedOn` (date you checked) and at least one of `facts` (one checked statement each with `source` label and http/https link; prefer vendor documentation), `openPoints` (what you could not verify, with `owner`: who can answer) and `sources`. Put one on the whole profile and on a brick, platform or recipe when facts belong to just that item. Keep each text under 300 characters.

### Recipes
For each useful combination of bricks: `title`, `bricks`, `why`, `what`, `how`, `difficulty`, and one concrete `example`. The bricks of a recipe should connect through studs.

### Studs
A small fixed vocabulary, usually 3 to 8. Each needs `id`, `label` and a short `description`.

## 4. Rules for honest content

1. **Never invent.** If a fact is unknown, leave out the optional field. For required fields, write the best verified statement and add the open point to `notes` in your hand-over message (section 8).
2. **Verify infrastructure claims** (supported operating systems, runtime versions) against official vendor documentation. Do not rely on memory.
3. **Separate what the company has from what exists in general.** A tool in the vendor catalogue that the company does not own is not a brick. If it is wanted but not present, use `status: "planned"`.
4. **Plain language.** `why` and `what` are read by managers and developers together. No unexplained jargon, no marketing words.
5. **Keep it short.** Respect the length limits in the schema.
6. **IDs are permanent.** Lowercase slugs like `github-copilot`. Never rename an id after delivery.
7. **No secrets.** No tokens, internal URLs with credentials, or personal data.

## 5. Difficulty ratings

Both ratings use whole stars from 1 to 5. **More stars means harder.** Every rating needs a `why` that names the actual reason.

| Stars | Installation | Usage |
|---|---|---|
| 1 | Already present or a standard installer | Nothing to learn |
| 2 | Standard install plus a sign-in or small setting | Familiar chat or menu use |
| 3 | Several tools must be connected by hand | Needs some practice or knowing the concepts |
| 4 | Needs custom development or an approval process | Needs technical skill to use well |
| 5 | Needs infrastructure work across teams | Needs expert knowledge |

Example of a good reason: "The initial manual connection of all tools: Node.js, the MCP entry, the browser option and Copilot agent mode."

For a recipe, rate the whole setup, not the single bricks.

## 6. Procedure

1. List every tool in scope with a short note on where you found it.
2. For each tool, decide: owned, planned or restricted. Drop tools that are none of these.
3. Define the studs from how the tools really connect.
4. For each tool, find what it runs on. Create platforms as needed.
5. Verify platform and version claims in official documentation.
6. Fill in all texts and ratings.
7. Define recipes from combinations that work today.
8. Validate the file (section 7) and fix every error.
9. Deliver the file and the hand-over message (section 8).

## 7. Validation

The file must pass the JSON Schema below. In addition, these rules **cannot be expressed in the schema** and must be checked in code:

- stud ids, brick ids, platform ids and recipe ids are unique
- no id is used by both a brick and a platform
- every id in `provides` and `accepts` exists in `studs`
- every id in `runsOn` and `requires` exists in `platforms` or `bricks`
- the graph of all `runsOn` and `requires` entries has no cycles
- every id in a recipe's `bricks` exists in `bricks`

Warnings to resolve or explain: a recipe whose bricks do not connect through studs, a stud nobody uses, a platform nobody uses, a brick without `runsOn` or `requires` when platforms exist, a research link that is not http or https.

Quick check with Python:

```python
import json, sys
from jsonschema import Draft202012Validator, FormatChecker
schema, profile = (json.load(open(p)) for p in sys.argv[1:3])
errors = list(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(profile))
print(errors or "schema ok")
```

## 8. Hand-over message

Return the JSON file, plus a short list with:
- **Sources:** where each group of facts came from.
- **Assumptions:** anything you decided without confirmation.
- **Open points:** facts you could not verify, and who could answer them (also put them in the `research` block).
- **Warnings:** the unresolved validation warnings.

## 9. JSON Schema (version 1.3)

Save as `schema/catalog.schema.json`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.internal/ai-toolkit/catalog.schema.json",
  "title": "AI toolkit catalog",
  "description": "Contract between the catalog editor and the viewer. Version 1.3 adds research blocks (verified facts, open points, sources), lets runsOn name bricks, adds requires for mandatory items, and extends the categories. 1.3 is not compatible with 1.0, 1.1 or 1.2; the viewer reads 1.3 only. Structural rules live here; cross-reference rules (see x-crossReferenceRules) must be checked in code by the editor on export and by the viewer on load.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "meta",
    "studs",
    "platforms",
    "bricks",
    "recipes"
  ],
  "properties": {
    "schemaVersion": {
      "const": "1.3",
      "description": "The viewer rejects any other value."
    },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "title",
        "updated"
      ],
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "description": {
          "type": "string",
          "maxLength": 400
        },
        "language": {
          "type": "string",
          "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
          "default": "en"
        },
        "updated": {
          "type": "string",
          "format": "date"
        },
        "owner": {
          "type": "string",
          "maxLength": 80
        }
      }
    },
    "studs": {
      "type": "array",
      "description": "Small fixed vocabulary of connection types. A brick offers some studs and accepts others. Drawn as cables between bricks, running from the brick that uses a capability to the brick that offers it.",
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/stud"
      }
    },
    "platforms": {
      "type": "array",
      "description": "Infrastructure that bricks and other platforms run on: host apps, runtimes, operating systems. Shown in the optional infrastructure layer of the details panel, with the foundation at the bottom. May be empty.",
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/platform"
      }
    },
    "bricks": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/brick"
      }
    },
    "recipes": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/recipe"
      }
    },
    "research": {
      "$ref": "#/$defs/research",
      "description": "Research for the whole profile: what was checked, when, and what is still open."
    }
  },
  "$defs": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",
      "minLength": 2,
      "maxLength": 48,
      "description": "Stable lowercase slug. Never change an id after publishing; references depend on it."
    },
    "link": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "label",
        "url"
      ],
      "properties": {
        "label": {
          "type": "string",
          "maxLength": 60
        },
        "url": {
          "type": "string",
          "format": "uri"
        }
      }
    },
    "why": {
      "type": "string",
      "minLength": 1,
      "maxLength": 600,
      "description": "Why it matters: the value, in plain language."
    },
    "what": {
      "type": "string",
      "minLength": 1,
      "maxLength": 600,
      "description": "What it is and what it does."
    },
    "how": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 300
      },
      "description": "Ordered steps to get started: installation and first use."
    },
    "rating": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "stars",
        "why"
      ],
      "properties": {
        "stars": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5,
          "description": "1 is very easy, 5 is very hard."
        },
        "why": {
          "type": "string",
          "minLength": 1,
          "maxLength": 300,
          "description": "The reason for this rating, for example the initial manual connection of all tools."
        }
      }
    },
    "difficulty": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "installation",
        "usage"
      ],
      "properties": {
        "installation": {
          "$ref": "#/$defs/rating"
        },
        "usage": {
          "$ref": "#/$defs/rating"
        }
      }
    },
    "stud": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        },
        "description": {
          "type": "string",
          "maxLength": 200
        }
      }
    },
    "platform": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label",
        "kind",
        "summary"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "label": {
          "type": "string",
          "minLength": 1,
          "maxLength": 40
        },
        "kind": {
          "enum": [
            "host-app",
            "runtime",
            "os",
            "container",
            "cloud",
            "other"
          ],
          "description": "host-app: an application that hosts a brick, shown as 'running inside' (VS Code). All other kinds are shown as 'running on' (Node.js, Python, an operating system, Docker, a cloud service)."
        },
        "summary": {
          "type": "string",
          "minLength": 1,
          "maxLength": 140,
          "description": "One line answering: what is this?"
        },
        "why": {
          "$ref": "#/$defs/why"
        },
        "what": {
          "$ref": "#/$defs/what"
        },
        "how": {
          "$ref": "#/$defs/how"
        },
        "difficulty": {
          "$ref": "#/$defs/difficulty"
        },
        "variants": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 40
          },
          "description": "Display only. Concrete flavours grouped under this platform, for example Windows, macOS, Linux."
        },
        "runsOn": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "description": "Ids of platforms or bricks this platform runs on or inside. Alternatives: one of them is enough. Must not form a cycle together with requires."
        },
        "links": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/link"
          }
        },
        "requires": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "description": "Ids of platforms or bricks that are all needed. Must not form a cycle together with runsOn."
        },
        "research": {
          "$ref": "#/$defs/research"
        }
      }
    },
    "brick": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "category",
        "summary",
        "why",
        "what",
        "how",
        "difficulty",
        "provides",
        "accepts",
        "status"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 60
        },
        "category": {
          "enum": [
            "ai-assistant",
            "automation",
            "browser",
            "connector",
            "data",
            "database",
            "agent-component",
            "skill",
            "other"
          ]
        },
        "summary": {
          "type": "string",
          "minLength": 1,
          "maxLength": 140,
          "description": "One line answering: what is this?"
        },
        "why": {
          "$ref": "#/$defs/why"
        },
        "what": {
          "$ref": "#/$defs/what"
        },
        "how": {
          "$ref": "#/$defs/how"
        },
        "difficulty": {
          "$ref": "#/$defs/difficulty"
        },
        "provides": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "description": "Stud ids this brick offers to others."
        },
        "accepts": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "description": "Stud ids this brick can plug into. Brick A uses brick B when A.accepts and B.provides share a stud."
        },
        "runsOn": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "minItems": 1,
          "description": "Ids of platforms or bricks this brick runs on or inside (pgvector inside PostgreSQL). Alternatives: one of them is enough (Node.js or Python). Leave out when unknown."
        },
        "status": {
          "enum": [
            "available",
            "planned",
            "restricted"
          ],
          "description": "available: set up and usable. planned: on the roadmap. restricted: owned but needs approval."
        },
        "icon": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Icon name from the icon set used by the viewer."
        },
        "color": {
          "enum": [
            "purple",
            "teal",
            "coral",
            "pink",
            "gray",
            "blue",
            "green",
            "amber",
            "red"
          ]
        },
        "links": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/link"
          }
        },
        "requires": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "minItems": 1,
          "description": "Ids of platforms or bricks that are all needed, in addition to one of runsOn. Shown as 'needs'."
        },
        "research": {
          "$ref": "#/$defs/research"
        }
      }
    },
    "recipe": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "title",
        "bricks",
        "why",
        "what",
        "how",
        "difficulty"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/id"
        },
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "bricks": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/id"
          },
          "description": "Brick ids that make up this setup. The recipe appears when all of them are picked."
        },
        "why": {
          "$ref": "#/$defs/why"
        },
        "what": {
          "$ref": "#/$defs/what"
        },
        "how": {
          "$ref": "#/$defs/how"
        },
        "difficulty": {
          "$ref": "#/$defs/difficulty"
        },
        "example": {
          "type": "string",
          "maxLength": 400,
          "description": "One concrete scenario that makes the result tangible."
        },
        "tags": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "type": "string",
            "maxLength": 30
          }
        },
        "research": {
          "$ref": "#/$defs/research"
        },
        "icon": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Icon name from the icon set used by the viewer, for the dashboard box of this use case."
        }
      }
    },
    "research": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "verifiedOn"
      ],
      "anyOf": [
        {
          "required": [
            "facts"
          ]
        },
        {
          "required": [
            "openPoints"
          ]
        },
        {
          "required": [
            "sources"
          ]
        }
      ],
      "description": "What was checked and where it came from. verifiedOn is the date the facts were last checked against their sources.",
      "properties": {
        "verifiedOn": {
          "type": "string",
          "format": "date"
        },
        "facts": {
          "type": "array",
          "maxItems": 30,
          "description": "Checked statements, each with the source it comes from.",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "text"
            ],
            "properties": {
              "text": {
                "type": "string",
                "minLength": 1,
                "maxLength": 300
              },
              "source": {
                "$ref": "#/$defs/link"
              }
            }
          }
        },
        "openPoints": {
          "type": "array",
          "maxItems": 20,
          "description": "Things that could not be verified or still need a decision.",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "text"
            ],
            "properties": {
              "text": {
                "type": "string",
                "minLength": 1,
                "maxLength": 300
              },
              "owner": {
                "type": "string",
                "maxLength": 80,
                "description": "Who can answer it."
              }
            }
          }
        },
        "sources": {
          "type": "array",
          "maxItems": 30,
          "items": {
            "$ref": "#/$defs/link"
          },
          "description": "Pages the research is based on."
        }
      }
    }
  },
  "x-crossReferenceRules": [
    "stud ids are unique",
    "brick ids and platform ids are unique, and no id is used by both a brick and a platform (a selection must be unambiguous)",
    "recipe ids are unique within a profile",
    "every id in brick.provides and brick.accepts exists in studs",
    "every id in runsOn and requires (bricks and platforms) exists in platforms or bricks, and nothing names itself",
    "the graph made of all runsOn and requires entries has no cycles (error)",
    "every id in recipe.bricks exists in bricks",
    "every recipe with 2+ bricks is connected: the bricks form one group when linked by provides/accepts, otherwise warn",
    "every stud is used by at least one brick (warn)",
    "every platform is used by at least one brick or platform (warn)",
    "when platforms exist, a brick without runsOn or requires is reported as having no infrastructure defined (warn)"
  ]
}
```

## 10. Example profile

A small, valid profile. Texts and ratings are placeholders. Replace everything with verified content.

```json
{
  "schemaVersion": "1.3",
  "meta": {
    "title": "Our AI and automation toolkit",
    "description": "Sample catalog. Texts and ratings are placeholders to be replaced with your own.",
    "language": "en",
    "updated": "2026-10-19"
  },
  "research": {
    "verifiedOn": "2026-10-19",
    "sources": [
      {
        "label": "Playwright MCP",
        "url": "https://github.com/microsoft/playwright-mcp"
      },
      {
        "label": "Microsoft Edge supported operating systems",
        "url": "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-supported-operating-systems"
      },
      {
        "label": "VS Code requirements",
        "url": "https://code.visualstudio.com/docs/supporting/requirements"
      },
      {
        "label": "Model Context Protocol repositories",
        "url": "https://github.com/orgs/modelcontextprotocol/repositories"
      }
    ]
  },
  "studs": [
    {
      "id": "mcp",
      "label": "MCP",
      "description": "Model Context Protocol connection"
    },
    {
      "id": "browser",
      "label": "Browser",
      "description": "Drives or reads a web browser"
    },
    {
      "id": "workflow",
      "label": "Workflow",
      "description": "Triggers or runs automations"
    }
  ],
  "platforms": [
    {
      "id": "vs-code",
      "label": "VS Code",
      "kind": "host-app",
      "summary": "Code editor that hosts Copilot and its agent mode.",
      "why": "Copilot does not run on its own. Everyone who uses it needs the editor.",
      "what": "Microsoft's code editor. Extensions such as GitHub Copilot run inside it.",
      "how": [
        "Install VS Code from the company software portal or the official download page.",
        "Open it and sign in to the extensions you need."
      ],
      "difficulty": {
        "installation": {
          "stars": 1,
          "why": "A standard installer, usually already present on developer machines."
        },
        "usage": {
          "stars": 2,
          "why": "Familiar to developers, new for everyone else."
        }
      },
      "runsOn": [
        "desktop-os"
      ],
      "research": {
        "verifiedOn": "2026-10-19",
        "facts": [
          {
            "text": "VS Code runs on 64-bit Windows client versions (not Windows Server), on macOS and on Linux (for example Ubuntu 20.04, Debian 10, RHEL 8, Fedora 36, with glibc 2.28 or newer).",
            "source": {
              "label": "VS Code requirements",
              "url": "https://code.visualstudio.com/docs/supporting/requirements"
            }
          }
        ],
        "sources": [
          {
            "label": "VS Code requirements",
            "url": "https://code.visualstudio.com/docs/supporting/requirements"
          }
        ]
      }
    },
    {
      "id": "nodejs",
      "label": "Node.js",
      "kind": "runtime",
      "summary": "JavaScript runtime for MCP servers started with npx.",
      "why": "Playwright MCP is started through Node.js, so the runtime has to be there first.",
      "what": "A JavaScript runtime that runs outside the browser. Playwright MCP needs version 18 or newer.",
      "how": [
        "Install Node.js 18 or newer.",
        "Check it in a terminal with node --version."
      ],
      "difficulty": {
        "installation": {
          "stars": 2,
          "why": "An installer is enough, but versions must match what the tools expect."
        },
        "usage": {
          "stars": 1,
          "why": "Runs in the background. Nobody has to use it directly."
        }
      },
      "runsOn": [
        "desktop-os"
      ],
      "research": {
        "verifiedOn": "2026-10-19",
        "openPoints": [
          {
            "text": "Operating system support of Node.js and Python on desktop systems was not checked.",
            "owner": "Profile owner"
          }
        ]
      }
    },
    {
      "id": "python",
      "label": "Python",
      "kind": "runtime",
      "summary": "Runtime for MCP servers built with the Python SDK.",
      "what": "A programming language runtime. MCP servers written with the official Python SDK run on it.",
      "runsOn": [
        "desktop-os"
      ]
    },
    {
      "id": "desktop-os",
      "label": "Desktop OS",
      "kind": "os",
      "summary": "The common desktop operating systems.",
      "variants": [
        "Windows",
        "macOS",
        "Linux"
      ]
    }
  ],
  "bricks": [
    {
      "id": "github-copilot",
      "name": "GitHub Copilot",
      "category": "ai-assistant",
      "summary": "AI assistant in the editor that can use tools.",
      "why": "Lets people hand routine work to an AI assistant without leaving the editor, and gives teams one place to reach every connected tool.",
      "what": "GitHub's AI assistant inside VS Code. In agent mode it plans a task and calls tools that are connected through MCP.",
      "how": [
        "Install the GitHub Copilot extension in VS Code.",
        "Sign in with your company GitHub account.",
        "Switch the chat to agent mode and add the MCP servers it should use."
      ],
      "difficulty": {
        "installation": {
          "stars": 2,
          "why": "A standard extension and a company sign-in. Adding MCP servers is a separate manual step."
        },
        "usage": {
          "stars": 2,
          "why": "Works through chat. The results still need a human review."
        }
      },
      "provides": [
        "workflow"
      ],
      "accepts": [
        "mcp"
      ],
      "runsOn": [
        "vs-code"
      ],
      "status": "available",
      "color": "purple"
    },
    {
      "id": "playwright-mcp",
      "name": "Playwright MCP",
      "category": "connector",
      "summary": "Lets an AI assistant operate a browser.",
      "why": "Repeats browser tasks and checks without anyone writing test code, so non-developers can ask for them in plain language.",
      "what": "An MCP server from Microsoft that gives an AI assistant the browser actions of Playwright. It can drive Edge.",
      "how": [
        "Install Node.js 18 or newer.",
        "Add the server to the MCP settings of your client with npx and @playwright/mcp@latest.",
        "Select Edge with the msedge browser option."
      ],
      "difficulty": {
        "installation": {
          "stars": 3,
          "why": "The first time, every piece is connected by hand: Node.js, the MCP entry and the browser option."
        },
        "usage": {
          "stars": 2,
          "why": "Describe the check in plain language, then review what it did."
        }
      },
      "provides": [
        "mcp"
      ],
      "accepts": [
        "browser"
      ],
      "runsOn": [
        "nodejs"
      ],
      "status": "available",
      "color": "teal",
      "research": {
        "verifiedOn": "2026-10-19",
        "facts": [
          {
            "text": "Playwright MCP needs Node.js 18 or newer and starts with npx @playwright/mcp@latest.",
            "source": {
              "label": "Playwright MCP",
              "url": "https://github.com/microsoft/playwright-mcp"
            }
          },
          {
            "text": "The option --browser msedge selects Edge.",
            "source": {
              "label": "Playwright MCP",
              "url": "https://github.com/microsoft/playwright-mcp"
            }
          },
          {
            "text": "VS Code can add the server from the command line with code --add-mcp.",
            "source": {
              "label": "Playwright MCP",
              "url": "https://github.com/microsoft/playwright-mcp"
            }
          }
        ],
        "sources": [
          {
            "label": "Playwright MCP",
            "url": "https://github.com/microsoft/playwright-mcp"
          }
        ]
      }
    },
    {
      "id": "custom-mcp-server",
      "name": "Custom MCP server",
      "category": "connector",
      "summary": "Any MCP server your teams write themselves.",
      "why": "Connects your own internal systems to the AI assistant without waiting for a vendor.",
      "what": "An MCP server built by your team with the official TypeScript or Python SDK.",
      "how": [
        "Pick Node.js or Python.",
        "Build the server with the matching official SDK.",
        "Register it in the MCP settings of your client."
      ],
      "difficulty": {
        "installation": {
          "stars": 4,
          "why": "Someone has to write, test and host the server first."
        },
        "usage": {
          "stars": 2,
          "why": "Once registered it behaves like any other MCP server."
        }
      },
      "provides": [
        "mcp"
      ],
      "accepts": [],
      "runsOn": [
        "nodejs",
        "python"
      ],
      "status": "planned",
      "color": "teal",
      "research": {
        "verifiedOn": "2026-10-19",
        "facts": [
          {
            "text": "The Model Context Protocol project publishes official TypeScript and Python SDKs.",
            "source": {
              "label": "Model Context Protocol repositories",
              "url": "https://github.com/orgs/modelcontextprotocol/repositories"
            }
          }
        ],
        "sources": [
          {
            "label": "Model Context Protocol repositories",
            "url": "https://github.com/orgs/modelcontextprotocol/repositories"
          }
        ]
      }
    },
    {
      "id": "edge",
      "name": "Microsoft Edge",
      "category": "browser",
      "summary": "The company browser, usable as an automation target.",
      "why": "Automations run in a browser your teams already use, so there is nothing new to roll out.",
      "what": "Microsoft's Chromium-based browser. It runs on Windows, macOS and Linux, and Playwright can launch it with the msedge option.",
      "how": [
        "Make sure Edge is installed.",
        "Select it by setting the browser option to msedge in Playwright MCP."
      ],
      "difficulty": {
        "installation": {
          "stars": 1,
          "why": "Usually already installed."
        },
        "usage": {
          "stars": 1,
          "why": "Nothing to learn. It is driven through Playwright MCP."
        }
      },
      "provides": [
        "browser"
      ],
      "accepts": [],
      "runsOn": [
        "desktop-os"
      ],
      "status": "available",
      "color": "coral",
      "research": {
        "verifiedOn": "2026-10-19",
        "facts": [
          {
            "text": "Edge runs on Windows, on macOS (macOS 13 or later for Edge 151 and newer) and on 64-bit Linux (Ubuntu 18.04, Debian 10, openSUSE 15.5 or Fedora 39 and later).",
            "source": {
              "label": "Microsoft Edge supported operating systems",
              "url": "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-supported-operating-systems"
            }
          },
          {
            "text": "Chromebooks are not supported.",
            "source": {
              "label": "Microsoft Edge supported operating systems",
              "url": "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-supported-operating-systems"
            }
          }
        ],
        "sources": [
          {
            "label": "Microsoft Edge supported operating systems",
            "url": "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-supported-operating-systems"
          }
        ]
      }
    }
  ],
  "recipes": [
    {
      "id": "browser-checks-without-code",
      "title": "Browser checks without test code",
      "bricks": [
        "github-copilot",
        "playwright-mcp",
        "edge"
      ],
      "why": "People can check internal web apps by describing the check in plain language, instead of waiting for someone to write test scripts.",
      "what": "Copilot receives the request and calls Playwright MCP. Playwright drives Edge through the steps and reports back.",
      "how": [
        "Install Node.js 18 or newer.",
        "Register the Playwright MCP server in the Copilot MCP settings.",
        "Set the browser option to msedge.",
        "Ask Copilot in agent mode to run your first check."
      ],
      "example": "Ask Copilot to log in to the portal and confirm the monthly report page loads.",
      "difficulty": {
        "installation": {
          "stars": 3,
          "why": "The initial manual connection of all tools: Node.js, the MCP entry, the browser option and Copilot agent mode."
        },
        "usage": {
          "stars": 2,
          "why": "Describe the check in plain language and review the result."
        }
      },
      "tags": [
        "testing",
        "browser"
      ],
      "icon": "globe"
    }
  ]
}
```

## 11. Several topics: the collection (only when asked)

For a whole package each topic is its own profile file, and a small `collection.json` lists them. The viewer shows one page per use case, grouped by topic, in this order. File names have no paths. Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.internal/ai-toolkit/collection.schema.json",
  "title": "AI toolkit collection",
  "description": "Manifest of a package: which topics (profile files) the viewer shows, in which order, and with which icon. Each topic is one profile that follows catalog.schema.json. Use cases (recipes) of each profile become the pages of the viewer. The viewer reads collection version 1.0 only.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "title",
    "topics"
  ],
  "properties": {
    "schemaVersion": {
      "const": "1.0"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 80
    },
    "description": {
      "type": "string",
      "maxLength": 400
    },
    "topics": {
      "type": "array",
      "minItems": 1,
      "maxItems": 40,
      "description": "Order matters: it is the order of the dashboard and of the Back and Next navigation.",
      "items": {
        "$ref": "#/$defs/topic"
      }
    }
  },
  "$defs": {
    "topic": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "file"
      ],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",
          "minLength": 2,
          "maxLength": 48,
          "description": "Stable slug used in page links. Never change it after publishing."
        },
        "file": {
          "type": "string",
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]*\\.json$",
          "maxLength": 80,
          "description": "File name of the profile next to the collection. No paths."
        },
        "icon": {
          "type": "string",
          "pattern": "^[a-z0-9-]+$",
          "description": "Icon name from the viewer's icon set, shown on the dashboard."
        }
      }
    }
  },
  "x-crossReferenceRules": [
    "topic ids are unique",
    "topic files are unique",
    "every listed file exists next to the collection and validates against catalog.schema.json (checked by the validate script and the viewer)"
  ]
}
```

Example:

```json
{
  "schemaVersion": "1.0",
  "title": "AI and automation toolkit",
  "description": "Demo package: six topics, each with its use cases. Facts were checked on 2026-10-19; texts and ratings are proposals.",
  "topics": [
    { "id": "n8n", "file": "profile-n8n.json", "icon": "workflow" },
    { "id": "agent-skills", "file": "profile-agent-skills.json", "icon": "bolt" },
    { "id": "agent-harness", "file": "profile-agent-harness.json", "icon": "bot" },
    { "id": "postgresql", "file": "profile-postgresql.json", "icon": "database" },
    { "id": "sqlite", "file": "profile-sqlite.json", "icon": "database" },
    { "id": "browser-automation", "file": "catalog.json", "icon": "globe" }
  ]
}
```
