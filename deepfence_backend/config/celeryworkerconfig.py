imports = (
    'tasks.email_sender',
    'tasks.notification_worker',
    'tasks.common_worker',
    # 'tasks.scope',
    'tasks.vulnerability_scan_worker',
    'tasks.notification',
    'tasks.reaper_tasks',
    'tasks.task_scheduler',
    'tasks.registry_images',
    'tasks.running_notification',
    'tasks.user_activity',
)

task_create_missing_queues = True
task_acks_late = True
broker_transport_options = {
    'visibility_timeout': 86400,
}
task_soft_time_limit = 86400
task_time_limit = 86400  # The worker processing the task will be killed and replaced with a new one when this is exceeded.
