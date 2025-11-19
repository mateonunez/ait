export interface ITemporalLabelService {
  buildTimeLabel(centerTime: Date, window: { start: Date; end: Date }): string;
  getTimeOfDay(date: Date): string;
}

export class TemporalLabelService implements ITemporalLabelService {
  buildTimeLabel(centerTime: Date, window: { start: Date; end: Date }): string {
    const now = new Date();
    const diffMs = now.getTime() - centerTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Format the date
    const dateStr = centerTime.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

    // Add time of day context
    const timeOfDay = this.getTimeOfDay(centerTime);

    // Create relative time label
    let relativeLabel = "";
    if (diffMinutes < 60) {
      relativeLabel = `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      relativeLabel = `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      relativeLabel = `${diffDays} days ago`;
    } else {
      relativeLabel = dateStr;
    }

    // If there's a significant time span in the window, note it
    const windowSpanHours = (window.end.getTime() - window.start.getTime()) / (1000 * 60 * 60);

    if (windowSpanHours > 0.5) {
      return `${dateStr} ${timeOfDay} (${relativeLabel})`;
    }

    return `${dateStr} ${timeOfDay}`;
  }

  getTimeOfDay(date: Date): string {
    const hours = date.getHours();

    if (hours < 6) return "(night)";
    if (hours < 12) return "(morning)";
    if (hours < 17) return "(afternoon)";
    if (hours < 21) return "(evening)";
    return "(night)";
  }
}
