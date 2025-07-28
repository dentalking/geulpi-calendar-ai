import axios from 'axios';

export interface MCPClient {
  playwrightMCP: PlaywrightMCPClient;
  filesystemMCP: FilesystemMCPClient;
  memoryMCP: MemoryMCPClient;
  context7MCP: Context7MCPClient;
}

// Base MCP client
class BaseMCPClient {
  protected baseURL: string;
  
  constructor(port: number, envVar?: string) {
    // Use environment variable if available, otherwise use host.docker.internal
    if (envVar && process.env[envVar]) {
      this.baseURL = process.env[envVar];
    } else {
      this.baseURL = `http://host.docker.internal:${port}`;
    }
  }
  
  protected async request(method: string, params: any = {}) {
    try {
      const response = await axios.post(this.baseURL, {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      });
      return response.data.result;
    } catch (error) {
      console.warn(`MCP request failed: ${error}`);
      throw error;
    }
  }
}

// Playwright MCP Client
export class PlaywrightMCPClient extends BaseMCPClient {
  constructor() {
    super(8093, 'MCP_PLAYWRIGHT_URL');
  }
  
  async navigate(url: string) {
    return this.request('puppeteer_navigate', { url });
  }
  
  async screenshot(name: string, selector?: string) {
    return this.request('puppeteer_screenshot', { name, selector });
  }
  
  async evaluate(script: string) {
    return this.request('puppeteer_evaluate', { script });
  }
}

// Filesystem MCP Client
export class FilesystemMCPClient extends BaseMCPClient {
  constructor() {
    super(8092, 'MCP_FILESYSTEM_URL');
  }
  
  async readFile(path: string) {
    return this.request('read_file', { path });
  }
  
  async listDirectory(path: string) {
    return this.request('list_directory', { path });
  }
  
  async searchFiles(path: string, pattern: string) {
    return this.request('search_files', { path, pattern });
  }
}

// Memory MCP Client (Sequential Thinking)
export class MemoryMCPClient extends BaseMCPClient {
  constructor() {
    super(8091, 'MCP_MEMORY_URL');
  }
  
  async createEntity(entity: any) {
    return this.request('create_entities', { entities: [entity] });
  }
  
  async searchEntities(query: any) {
    return this.request('search_nodes', query);
  }
  
  async createRelation(from: string, to: string, relationType: string) {
    return this.request('create_relations', { 
      relations: [{ from, to, relationType }] 
    });
  }
}

// Context7 MCP Client
export class Context7MCPClient extends BaseMCPClient {
  constructor() {
    super(8094, 'MCP_CONTEXT7_URL');
  }
  
  async resolveLibraryId(libraryName: string) {
    return this.request('resolve-library-id', { libraryName });
  }
  
  async getLibraryDocs(libraryId: string, topic?: string, tokens?: number) {
    return this.request('get-library-docs', {
      context7CompatibleLibraryID: libraryId,
      topic,
      tokens: tokens || 2000
    });
  }
}

// Factory function to create MCP clients
export function createMCPClients(): MCPClient {
  return {
    playwrightMCP: new PlaywrightMCPClient(),
    filesystemMCP: new FilesystemMCPClient(),
    memoryMCP: new MemoryMCPClient(),
    context7MCP: new Context7MCPClient()
  };
}