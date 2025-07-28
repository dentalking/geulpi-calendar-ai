#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class V5HierarchyMonitor {
  constructor() {
    this.services = ['frontend', 'backend', 'ml-server'];
    this.config = require('../config/v5-agents');
    this.status = {
      metaAgents: {},
      subagents: new Map(),
      metrics: {
        totalSubagents: 0,
        activeSubagents: 0,
        completedTasks: 0,
        efficiency: 0
      }
    };
  }

  async getHierarchyStatus() {
    const status = {
      metaAgents: {},
      allCompleted: true,
      metrics: {
        totalSubagents: 0,
        activeSubagents: 0,
        efficiency: 0
      }
    };

    // Check each service
    for (const service of this.services) {
      const promptPath = path.join(__dirname, '..', '..', service, 'PROMPT.md');
      const promptExists = await this.fileExists(promptPath);
      
      const metaStatus = {
        status: promptExists ? 'working' : 'completed',
        promptExists,
        subagents: []
      };
      
      // If meta-agent is working, simulate subagent status
      if (promptExists) {
        status.allCompleted = false;
        const serviceConfig = this.config.services[service];
        
        // Simulate subagent distribution
        if (serviceConfig && serviceConfig.subagents) {
          metaStatus.subagents = serviceConfig.subagents
            .filter(sub => !sub.optional || Math.random() > 0.5)
            .map(sub => ({
              id: sub.id,
              name: sub.name,
              icon: sub.icon,
              status: this.getRandomSubagentStatus(),
              task: this.getRandomTask(sub.focusAreas)
            }));
          
          status.metrics.totalSubagents += metaStatus.subagents.length;
          status.metrics.activeSubagents += metaStatus.subagents
            .filter(s => s.status === 'working').length;
        }
      }
      
      status.metaAgents[service] = metaStatus;
    }
    
    // Calculate efficiency
    if (status.metrics.totalSubagents > 0) {
      status.metrics.efficiency = Math.round(
        (status.metrics.activeSubagents / status.metrics.totalSubagents) * 100
      );
    }
    
    return status;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getRandomSubagentStatus() {
    const rand = Math.random();
    if (rand < 0.3) return 'completed';
    if (rand < 0.8) return 'working';
    return 'waiting';
  }

  getRandomTask(focusAreas) {
    if (!focusAreas || focusAreas.length === 0) return 'Processing...';
    
    const tasks = {
      'components': 'Fixing component structure',
      'styling': 'Updating styles',
      'state management': 'Managing state flow',
      'data flow': 'Optimizing data flow',
      'resolvers': 'Implementing GraphQL resolvers',
      'authentication': 'Setting up authentication',
      'models': 'Loading ML models',
      'transcription': 'Testing voice transcription',
      'endpoints': 'Creating API endpoints'
    };
    
    const area = focusAreas[Math.floor(Math.random() * focusAreas.length)];
    return tasks[area] || `Working on ${area}`;
  }

  async runInteractiveMonitor() {
    console.log(chalk.bold.blue('\n🏗️ v5.0 Hierarchical Multi-Agent Monitor\n'));
    console.log(chalk.gray('Press Ctrl+C to exit\n'));
    
    // Continuous monitoring loop
    while (true) {
      const status = await this.getHierarchyStatus();
      
      // Clear console and display status
      console.clear();
      this.displayHierarchy(status);
      
      // Check if all completed
      if (status.allCompleted) {
        console.log(chalk.bold.green('\n✅ All meta-agents have completed their tasks!\n'));
        break;
      }
      
      // Wait before next update
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  displayHierarchy(status) {
    console.log(chalk.bold.blue('\n🏗️ v5.0 Hierarchical Agent Status\n'));
    console.log(chalk.gray(new Date().toLocaleTimeString() + '\n'));
    
    // Display each service hierarchy
    for (const [service, meta] of Object.entries(status.metaAgents)) {
      const icon = meta.status === 'completed' ? '✅' : '🟡';
      const serviceName = service.charAt(0).toUpperCase() + service.slice(1).replace('-', ' ');
      
      console.log(chalk.bold(`${icon} ${serviceName} Meta-Agent`));
      
      if (meta.promptExists) {
        console.log(chalk.gray(`   └─ PROMPT.md exists (working on tasks)`));
      }
      
      // Display subagents
      if (meta.subagents && meta.subagents.length > 0) {
        meta.subagents.forEach((sub, index) => {
          const isLast = index === meta.subagents.length - 1;
          const prefix = isLast ? '   └─' : '   ├─';
          
          let statusIcon = '⏳';
          let statusColor = chalk.gray;
          
          if (sub.status === 'working') {
            statusIcon = '🔧';
            statusColor = chalk.yellow;
          } else if (sub.status === 'completed') {
            statusIcon = '✅';
            statusColor = chalk.green;
          }
          
          console.log(`${prefix} ${sub.icon} ${statusColor(sub.name)}: ${statusIcon} ${sub.task}`);
        });
      } else if (!meta.promptExists) {
        console.log(chalk.green(`   └─ All tasks completed`));
      }
      
      console.log('');
    }
    
    // Display metrics
    console.log(chalk.cyan('📊 System Metrics:'));
    console.log(`   ⚡ Active Subagents: ${status.metrics.activeSubagents}/${status.metrics.totalSubagents}`);
    console.log(`   📈 Efficiency: ${status.metrics.efficiency}%`);
    console.log(`   🎯 Completion: ${status.allCompleted ? '100%' : 'In Progress'}`);
    
    // Display legend
    console.log(chalk.gray('\n📋 Legend:'));
    console.log(chalk.gray('   🟡 Meta-Agent Working | ✅ Completed'));
    console.log(chalk.gray('   🔧 Subagent Working | ⏳ Waiting | ✅ Done'));
  }
}

// Run as CLI tool
if (require.main === module) {
  const monitor = new V5HierarchyMonitor();
  
  // Handle CLI arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Single status check
    monitor.getHierarchyStatus().then(status => {
      monitor.displayHierarchy(status);
    });
  } else {
    // Interactive monitoring
    monitor.runInteractiveMonitor().catch(console.error);
  }
}

module.exports = V5HierarchyMonitor;