"""Background scheduler that periodically evaluates CloudTrail watch rules.

`backend/run.py` (local dev) always disables Flask's debug reloader, so there
is only ever one process there. Production (gunicorn.conf.py) runs multiple
worker processes, each of which calls create_app() independently — without a
guard, every worker would start its own copy of this scheduler and each rule
would fire once per worker per tick. A simple PID lock file under STORAGE_ROOT
ensures only one live process owns the recurring job; if that process dies,
the next process to start reclaims the (now-stale) lock.
"""
import os
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler

_scheduler = None
_LOCK_FILENAME = ".cloudtrail_watch_scheduler.lock"


def _pid_alive(pid):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # process exists, just owned by someone else
    except OSError:
        return False
    return True


def _acquire_lock(storage_root):
    lock_path = Path(storage_root) / _LOCK_FILENAME
    my_pid = os.getpid()

    if lock_path.exists():
        try:
            holder_pid = int(lock_path.read_text().strip())
        except (ValueError, OSError):
            holder_pid = None
        if holder_pid and holder_pid != my_pid and _pid_alive(holder_pid):
            return False  # another live process already owns the scheduler

    try:
        lock_path.write_text(str(my_pid))
    except OSError:
        return False
    return True


def start_cloudtrail_watch_scheduler(app):
    """Idempotent: safe to call more than once per process."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    storage_root = app.config.get("STORAGE_ROOT", "storage")
    os.makedirs(storage_root, exist_ok=True)
    if not _acquire_lock(storage_root):
        app.logger.info("CloudTrail watch scheduler: another process already owns it here, skipping.")
        return None

    from backend.services.cloudtrail_watch_service import run_checks

    interval = int(os.getenv("CLOUDTRAIL_WATCH_INTERVAL_SECONDS", "60"))
    sched = BackgroundScheduler(daemon=True)
    sched.add_job(
        lambda: run_checks(app),
        "interval",
        seconds=interval,
        id="cloudtrail_watch",
        next_run_time=datetime.now(),  # also fire once immediately on startup
        max_instances=1,
        coalesce=True,
    )
    sched.start()
    _scheduler = sched
    app.logger.info(f"CloudTrail watch scheduler started (checking every {interval}s)")
    return sched
