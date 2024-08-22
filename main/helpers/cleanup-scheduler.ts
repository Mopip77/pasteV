
import log from 'electron-log/main';
import { singletons } from 'main/components/singletons';
import { DEFAULT_CLEANUP_DAYS } from 'main/utils/consts';
import schedule from 'node-schedule';

export const asyncCleanupHistory = async () => {
    const days = singletons.settings.loadConfig().historyClearDays || DEFAULT_CLEANUP_DAYS;
    if (days < 1) {
        log.info(`Cleanup history days ${days} is less than 1, skip cleanup`);
        return;
    }

    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - days);

    const pastDateString = pastDate.toISOString().split('T')[0];

    const deletedCount = singletons.db.deleteLastReadTimeBefore(pastDateString);

    log.info(`Cleanup history, configured day is ${days}, clean before ${pastDateString}, deleted count ${deletedCount}`);
}

export const registerCleanupScheduler = () => {
    log.info('Register cleanup scheduler');
    schedule.scheduleJob('0 1 * * *', asyncCleanupHistory);
}