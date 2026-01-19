import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const COMPOSE_FILE_PATTERN = /(docker-)?compose.*\.ya?ml$/i;
const README_CANDIDATES = ['README.md', 'readme.md'];
const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.idea',
  '.vscode',
  '__tests__',
  '__fixtures__'
]);

/**
 * Reads every docker-compose file under the provided directory and returns a summary of each.
 * @param {object} [options]
 * @param {string} [options.rootDir=process.cwd()] Directory that contains the compose examples.
 * @param {boolean} [options.includeSource=false] When true, the raw YAML string is included.
 * @param {boolean} [options.includeReadme=true] When true, the first sentence of an adjacent README is included.
 */
export async function listComposeExamples(options = {}) {
  const {
    rootDir = process.cwd(),
    includeSource = false,
    includeReadme = true
  } = options;

  const absoluteRoot = path.resolve(rootDir);
  const composeFiles = await collectComposeFiles(absoluteRoot);
  const examples = [];

  for (const composeFile of composeFiles) {
    const summary = await parseComposeFile(composeFile, absoluteRoot, {
      includeSource,
      includeReadme
    });
    if (summary) {
      examples.push(summary);
    }
  }

  return examples;
}

/**
 * Fetches a single compose example by id, relative path, or friendly name.
 * @param {string} identifier
 * @param {object} [options]
 */
export async function getComposeExample(identifier, options = {}) {
  if (!identifier) {
    throw new Error('An identifier (id, relative path, or name) is required.');
  }

  const normalized = identifier.toLowerCase();
  const examples = await listComposeExamples(options);

  return (
    examples.find((example) => {
      return (
        example.id.toLowerCase() === normalized ||
        example.relativePath.toLowerCase() === normalized ||
        example.name.toLowerCase() === normalized
      );
    }) ?? null
  );
}

/**
 * Filters compose examples using simple criteria (service name/image, env var, or port).
 * @param {object} [criteria]
 * @param {string} [criteria.service] Service name or image substring to match.
 * @param {string|number} [criteria.port] Container or host port to match.
 * @param {string[]|Record<string, string>} [criteria.environment] Environment variable keys that must exist.
 * @param {object} [options]
 */
export async function findComposeExamples(criteria = {}, options = {}) {
  const examples = await listComposeExamples(options);
  return examples.filter((example) => matchesCriteria(example, criteria));
}

function matchesCriteria(example, criteria) {
  const { service, port, environment } = criteria;

  if (service) {
    const search = service.toLowerCase();
    const serviceMatch = example.services.some((entry) => {
      return (
        entry.name.toLowerCase().includes(search) ||
        (entry.image ?? '').toLowerCase().includes(search)
      );
    });

    if (!serviceMatch) {
      return false;
    }
  }

  if (typeof port !== 'undefined') {
    const wantedPort = String(port);
    const portMatch = example.services.some((entry) =>
      entry.ports.some((p) => {
        const portCandidates = [p.target, p.published].filter((value) =>
          Number.isFinite(value)
        );
        if (portCandidates.some((value) => String(value) === wantedPort)) {
          return true;
        }
        return typeof p.raw === 'string' && p.raw.includes(wantedPort);
      })
    );

    if (!portMatch) {
      return false;
    }
  }

  if (environment) {
    const keys = Array.isArray(environment)
      ? environment
      : Object.keys(environment);
    const envMatch = keys.every((key) =>
      example.services.some((entry) =>
        Object.prototype.hasOwnProperty.call(entry.environment, key)
      )
    );

    if (!envMatch) {
      return false;
    }
  }

  return true;
}

async function collectComposeFiles(rootDir) {
  const result = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (shouldIgnore(entry)) {
        continue;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && COMPOSE_FILE_PATTERN.test(entry.name)) {
        result.push(fullPath);
      }
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

function shouldIgnore(entry) {
  if (entry.name === '.' || entry.name === '..') {
    return true;
  }

  if (entry.isDirectory()) {
    if (entry.name.startsWith('.')) {
      return true;
    }

    if (DEFAULT_IGNORED_DIRS.has(entry.name)) {
      return true;
    }
  }

  return false;
}

async function parseComposeFile(filePath, rootDir, options = {}) {
  const raw = await readFile(filePath, 'utf8');
  const document = YAML.parse(raw);

  if (
    !document ||
    typeof document !== 'object' ||
    typeof document.services !== 'object'
  ) {
    return null;
  }

  const services = Object.entries(document.services).map(
    ([name, config]) => summarizeService(name, config ?? {})
  );

  const relativePath = path.relative(rootDir, filePath) || path.basename(filePath);
  const tags = deriveTags(relativePath);
  const description = options.includeReadme
    ? await readReadmeSummary(path.dirname(filePath))
    : null;

  const summary = {
    id: slugify(relativePath),
    name: deriveName(relativePath),
    relativePath,
    absolutePath: filePath,
    version: document.version ?? null,
    tags,
    description,
    services,
    serviceCount: services.length,
    compose: document
  };

  if (options.includeSource) {
    summary.source = raw;
  }

  return summary;
}

function summarizeService(name, config) {
  return {
    name,
    image: config.image ?? null,
    containerName: config.container_name ?? null,
    environment: normalizeEnvironment(config.environment),
    ports: normalizePorts(config.ports),
    volumes: normalizeVolumes(config.volumes),
    raw: config
  };
}

function normalizeEnvironment(environment) {
  if (!environment) {
    return {};
  }

  if (Array.isArray(environment)) {
    return environment.reduce((acc, entry) => {
      if (typeof entry !== 'string') {
        return acc;
      }

      const [key, ...rest] = entry.split('=');
      if (!key) {
        return acc;
      }

      acc[key.trim()] = rest.join('=').trim();
      return acc;
    }, {});
  }

  if (typeof environment === 'object') {
    return Object.keys(environment).reduce((acc, key) => {
      acc[key] = environment[key];
      return acc;
    }, {});
  }

  return {};
}

function normalizePorts(ports) {
  if (!Array.isArray(ports)) {
    return [];
  }

  return ports
    .map((entry) => {
      if (typeof entry === 'string') {
        const parsed = parsePortMapping(entry);
        return { ...parsed, raw: entry };
      }

      if (entry && typeof entry === 'object') {
        return {
          protocol: entry.protocol ?? 'tcp',
          target: toNumber(
            entry.target ?? entry.container_port ?? entry.target_port
          ),
          published: toNumber(
            entry.published ??
              entry.host_port ??
              entry.published_port ??
              entry.exposed
          ),
          host: entry.host ?? entry.host_ip ?? null,
          raw: entry
        };
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeVolumes(volumes) {
  if (!Array.isArray(volumes)) {
    return [];
  }

  return volumes
    .map((entry) => {
      if (typeof entry === 'string') {
        const [source, target, mode] = entry.split(':');
        return {
          source: source || null,
          target: target || null,
          mode: mode ?? 'rw',
          raw: entry
        };
      }

      if (entry && typeof entry === 'object') {
        return {
          source: entry.source ?? null,
          target: entry.target ?? entry.target_path ?? null,
          type: entry.type ?? null,
          readOnly: Boolean(
            entry.read_only ?? entry.readOnly ?? entry.ro ?? false
          ),
          raw: entry
        };
      }

      return null;
    })
    .filter(Boolean);
}

function parsePortMapping(value) {
  const [mapping, protocol = 'tcp'] = value.split('/');
  const segments = mapping.split(':');
  const parsed = { protocol };

  if (segments.length === 1) {
    parsed.target = toNumber(segments[0]);
  } else if (segments.length === 2) {
    parsed.published = toNumber(segments[0]);
    parsed.target = toNumber(segments[1]);
  } else if (segments.length === 3) {
    parsed.host = segments[0] || null;
    parsed.published = toNumber(segments[1]);
    parsed.target = toNumber(segments[2]);
  }

  return parsed;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function deriveTags(relativePath) {
  const segments = path
    .dirname(relativePath)
    .split(path.sep)
    .filter(Boolean);

  const base = path.basename(relativePath, path.extname(relativePath));

  if (base && !segments.includes(base)) {
    segments.push(base);
  }

  return segments;
}

function deriveName(relativePath) {
  const segments = relativePath.split(path.sep).filter(Boolean);

  if (!segments.length) {
    return relativePath;
  }

  const fileName = segments.pop();
  const baseName = fileName.replace(/\.ya?ml$/i, '');

  if (!segments.length) {
    return baseName;
  }

  return `${segments.join(' / ')} (${baseName})`;
}

function slugify(value) {
  return value
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function readReadmeSummary(directory) {
  for (const candidate of README_CANDIDATES) {
    const fullPath = path.join(directory, candidate);
    try {
      const raw = await readFile(fullPath, 'utf8');
      const summary = raw
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))[0];

      if (summary) {
        return summary;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return null;
}
