from datetime import timedelta
from celery.schedules import crontab

imports = (
    'tasks.email_sender',
    'tasks.notification',
    'tasks.reaper_tasks',
    'tasks.task_scheduler',
    'tasks.registry_images',
    'tasks.running_notification',
    'tasks.user_activity',
)

beat_schedule = {
    'scheduler': {
        'task': 'tasks.notification.scheduler',
        'schedule': timedelta(minutes=1),
        'args': [],
        'relative': True,
    },
    'pdf_report_fix': {
        'task': 'tasks.reaper_tasks.pdf_report_fix',
        'schedule': timedelta(minutes=1),
        'args': [],
        'relative': True,
    },
    'tag_k8s_cluster_name_in_docs': {
        'task': 'tasks.reaper_tasks.tag_k8s_cluster_name_in_docs',
        'schedule': timedelta(minutes=10),
        'args': [],
        'relative': True,
    },
    'check_integration_failures': {
        'task': 'tasks.reaper_tasks.check_integration_failures',
        'schedule': timedelta(minutes=1),
        'args': [],
        'relative': True,
    },
    'task_scheduler': {
        'task': 'tasks.task_scheduler.task_scheduler',
        'schedule': timedelta(hours=1),
        'args': [],
        'relative': False,
    },
    'update_all_registry_images': {
        'task': 'tasks.registry_images.update_all_registry_images',
        'schedule': timedelta(days=1),
        'args': [],
        'relative': False,
    },
    'cve_fix_interrupted': {
        'task': 'tasks.reaper_tasks.cve_fix_interrupted',
        'schedule': timedelta(minutes=2),
        'args': [],
        'relative': True,
    },
    'cve_db_update_notification': {
        'task': 'tasks.running_notification.cve_db_update_notification',
        'schedule': crontab(minute=0, hour='*/4'),
        'args': [],
    },
    'deepfence_health_notification': {
        'task': 'tasks.running_notification.deepfence_health_notification',
        'schedule': timedelta(seconds=60),
        'args': [],
        'relative': True,
    },
    'deepfence_console_resource_usage_notification': {
        'task': 'tasks.running_notification.deepfence_console_host_stats',
        'schedule': timedelta(seconds=60),
        'args': [],
        'relative': True,
    },
    'delete_expired_user_activity_data': {
        'task': 'tasks.reaper_tasks.delete_expired_user_activity_data',
        'schedule': timedelta(days=1),
        'args': [],
        'relative': True,
    },
    'vulnerability_container_logs_delete_old': {
        'task': 'tasks.reaper_tasks.vulnerability_container_logs_delete_old',
        'schedule': timedelta(days=1),
        'args': [],
        'relative': True,
    },
}

task_acks_late = True
broker_transport_options = {
    'visibility_timeout': 18000,
}
# The worker processing the task will be killed and replaced with a new one when this is exceeded.
task_soft_time_limit = 18000
task_time_limit = 18000
