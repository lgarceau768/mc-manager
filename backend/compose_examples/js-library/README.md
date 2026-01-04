# mc-compose-examples

Tiny helper library that scans the `itzg/docker-minecraft-server` compose examples and returns structured metadata about each stack. Use it to discover the variants that exist in this repository, inspect their service configuration, or surface information about ports, environment variables, and volumes without manually opening every YAML file.

> **Node.js** 18 or newer is required.

## Installation

Because this package is local to the compose examples, install it via a file path:

```bash
# From another workspace that wants to consume the helpers
npm install /absolute/path/to/backend/compose_examples/js-library
```

If you are already in the `compose_examples` directory you can also `npm install ./js-library`.

## Quick start

```js
import {
  listComposeExamples,
  getComposeExample,
  findComposeExamples
} from 'mc-compose-examples';

const rootDir = '/Users/lgarceau/Code/personal/mc-server-manager/backend/compose_examples';

const allExamples = await listComposeExamples({ rootDir });
console.log(allExamples.length); // -> number of docker-compose files discovered

const vanilla = await getComposeExample('docker-compose.yml', { rootDir });
console.log(vanilla.services[0].environment.EULA); // -> "TRUE"

const geyserExamples = await findComposeExamples(
  { service: 'geyser', port: 19132 },
  { rootDir }
);
```

## API

### `listComposeExamples(options?) => Promise<Example[]>`

Recursively scans `options.rootDir` (default `process.cwd()`) for files matching `compose*.yml|yaml`, parses them, and returns an array of summaries. Set `includeSource: true` to attach the raw YAML string to each example, or `includeReadme: false` to skip README lookups.

### `getComposeExample(identifier, options?) => Promise<Example|null>`

Looks up a single example by id (slugified file path), relative path, or friendly name (e.g. `auto-curseforge / atm8`). Returns `null` if no match is found.

### `findComposeExamples(criteria?, options?) => Promise<Example[]>`

Filters the parsed examples using any combination of the following keys:

| Key | Type | Description |
| --- | ---- | ----------- |
| `service` | `string` | Matches service names or image names. |
| `port` | `number \| string` | Matches container or published ports. |
| `environment` | `string[] \| Record<string,string>` | Ensures each listed variable is declared by at least one service. |

The `options` argument is the same as `listComposeExamples`.

## Example shape

Each `Example` object looks like:

```ts
{
  id: 'auto-curseforge-atm8-docker-compose-yml',
  name: 'auto-curseforge / atm8 (docker-compose)',
  relativePath: 'auto-curseforge/atm8/docker-compose.yml',
  absolutePath: '/abs/path/auto-curseforge/atm8/docker-compose.yml',
  version: '3.8',
  tags: ['auto-curseforge', 'atm8', 'docker-compose'],
  description: 'First non-heading line from README.md (if available)',
  serviceCount: 2,
  services: [
    {
      name: 'minecraft',
      image: 'itzg/minecraft-server',
      containerName: 'atm8',
      environment: { EULA: 'TRUE', MEMORY: '8G', ... },
      ports: [
        { protocol: 'tcp', published: 25565, target: 25565, raw: '25565:25565' }
      ],
      volumes: [
        { source: './data', target: '/data', mode: 'rw', raw: './data:/data' }
      ],
      raw: { ...original docker-compose service block... }
    }
  ],
  compose: { ...full parsed YAML document... },
  source: 'raw YAML string' // when includeSource: true
}
```

`tags` are derived from the directory structure and filename, making it easy to group stacks. The `services` array contains normalized views of ports, environment variables, and volumes plus the untouched `raw` config for anything custom.

## Tips

- Use the `description` field to surface README summaries in your UI. It reads the first non-heading line next to each compose file when available.
- The helpers only care about files that include the word `compose` in their name, preventing unrelated Kubernetes manifests from being parsed accidentally.
- Because the raw YAML is available through `example.compose` (and optionally `example.source`), you can still access any sections that are not normalized by the helper such as `deploy`, `configs`, or custom extensions.
