import type { Task } from '../../types/agent';

export class TaskPrioritizer {
  prioritizeTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      // Consider multiple factors for prioritization
      const priorityScore = {
        a: this.calculatePriorityScore(a),
        b: this.calculatePriorityScore(b)
      };
      return priorityScore.b - priorityScore.a;
    });
  }

  private calculatePriorityScore(task: Task): number {
    let score = task.priority || 0;

    // Add urgency factor
    if (task.metadata?.urgent) score += 5;

    // Add complexity factor
    score += this.getComplexityScore(task);

    // Add dependency factor
    score += this.getDependencyScore(task);

    return score;
  }

  private getComplexityScore(task: Task): number {
    const complexityFactors = {
      security: 3,
      financial: 2,
      technical: 2,
      default: 1
    };
    return complexityFactors[task.type] || complexityFactors.default;
  }

  private getDependencyScore(task: Task): number {
    return (task.dependencies?.length || 0) * -1; // Lower score for more dependencies
  }
}