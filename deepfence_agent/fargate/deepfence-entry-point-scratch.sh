#!/deepfence/bin/bash

############################################################
# Start Deepfence Agent Services
############################################################
echo "Start Deepfence services... Console is $MGMT_CONSOLE_URL"
# exec setsid /deepfence/usr/local/bin/start-df-services.sh &
/deepfence/bin/bash /deepfence/usr/local/bin/start-df-services.sh &
# Wait for the agent to start
/deepfence/bin/sleep 20
echo "Deepfence agent started..."

############################################################
# Start the customer application entry point below... 
############################################################
#echo "Starting the customer application entry point below..."
#cust-entry-point.sh "$@"

# Execute customer entry-point if provided as arguments
if [ "$#" -ne 0 ]; then
    echo "Application entry-point specified as arguments to deepfence entrypoint. Execute application entrypoint."
    echo executing -- "$@"
    "$@"
else
    echo "No application entry-point specified as arguments to deepfence entrypoint."
fi

#echo "Block to avoid agent container from exiting fargate. Not needed if customer application blocks"
#/deepfence/usr/local/bin/block-scratch.sh
echo "Agent entry-point-scratch exiting...."

