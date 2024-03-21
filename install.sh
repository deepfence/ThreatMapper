#!/bin/bash

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'  # No color

# Checkmark and Cross symbols
CHECKMARK="${GREEN}✔${NC}"
CROSS="${RED}✘${NC}"
INFO="${BLUE}ℹ${NC}"

# Default values
DEFAULT_IMAGE_TAG="2.2.0"
DEFAULT_STORAGE_CLASS=""
# Auto-generate default Neo4j password
DEFAULT_NEO4J_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -d|--deployment)
        DEPLOYMENT="$2"
        shift
        shift
        ;;
        -t|--image-tag)
        IMAGE_TAG="$2"
        shift
        shift
        ;;
        -n|--no-prompt)
        NO_PROMPT=true
        shift
        ;;
        -h|--help)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  -d, --deployment     Specify the deployment type: 'docker' or 'kubernetes'"
        echo "  -t, --image-tag      Specify the image tag for the Deepfence components (default: $DEFAULT_IMAGE_TAG) (optional)"
        echo "  -n, --no-prompt      Do not prompt for input (optional)"
        echo "  -h, --help           Display usage instructions"
        exit 0
        ;;
        *) # Unknown option
        echo "Unknown option: $key"
        exit 1
        ;;
    esac
done

# Set image tag
if [[ -n $IMAGE_TAG ]]; then
    echo -e "${CHECKMARK} Using image tag: $IMAGE_TAG"
elif [[ -n $DF_IMG_TAG ]]; then
    IMAGE_TAG=$DF_IMG_TAG
    echo -e "${CHECKMARK} Using image tag from DF_IMG_TAG environment variable: $IMAGE_TAG"
else
    IMAGE_TAG=$DEFAULT_IMAGE_TAG
    echo -e "${CHECKMARK} Using default image tag: $IMAGE_TAG"
fi

# Prompt for storage class in case of Kubernetes deployment
if [[ $DEPLOYMENT == "kubernetes" ]]; then
    if [[ -z $STORAGE_CLASS ]]; then
        if [[ $NO_PROMPT == true ]]; then
            STORAGE_CLASS=$DEFAULT_STORAGE_CLASS
        else
            read -p "Enter storage class (default: <none>): " input_storage_class
            STORAGE_CLASS=${input_storage_class:-$DEFAULT_STORAGE_CLASS}
        fi
    fi
    echo -e "${CHECKMARK} Using storage class: $STORAGE_CLASS"

    # Prompt for Neo4j password in case of Kubernetes deployment
    if [[ -z $NEO4J_PASSWORD ]]; then
        if [[ $NO_PROMPT == true ]]; then
            NEO4J_PASSWORD=$DEFAULT_NEO4J_PASSWORD
        else
            read -p "Enter Neo4j password (default: $DEFAULT_NEO4J_PASSWORD): " input_neo4j_password
            NEO4J_PASSWORD=${input_neo4j_password:-$DEFAULT_NEO4J_PASSWORD}
        fi
    fi
    echo -e "${CHECKMARK} Using Neo4j password"
fi

# Check minimum system requirements for Docker
check_docker_requirements() {
    echo -e "${GREEN}Checking minimum system requirements for Docker...${NC}"

    # Check CPU cores
    MIN_CPU=4
    ACTUAL_CPU=$(nproc)
    if [[ $ACTUAL_CPU -lt $MIN_CPU ]]; then
        echo -e "${CROSS} Insufficient CPU cores for Docker. Minimum requirement: $MIN_CPU cores.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} CPU cores check passed for Docker."

    # Check RAM
    MIN_RAM=16
    ACTUAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $ACTUAL_RAM -lt $MIN_RAM ]]; then
        echo -e "${CROSS} Insufficient RAM for Docker. Minimum requirement: $MIN_RAM GB.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} RAM check passed for Docker."
}

# Check Docker and Docker Compose
check_docker() {
    echo -e "${GREEN}Checking Docker and Docker Compose...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${CROSS} Docker not found. Please install Docker.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} Docker check passed."

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${CROSS} Docker Compose not found. Please install Docker Compose.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} Docker Compose check passed."
}

# Check CPU and RAM for each Kubernetes node
check_kubernetes_node_requirements() {
    echo -e "${GREEN}Checking CPU and RAM for each Kubernetes node...${NC}"
    MIN_CPU=4
    MIN_RAM=8

    # Get the number of nodes in the Kubernetes cluster
    NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
    if [[ $NODE_COUNT -lt 3 ]]; then
        echo -e "${CROSS} Insufficient number of Kubernetes nodes. Minimum requirement: 3 nodes.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} Kubernetes nodes check passed."

    # Check CPU and RAM for each node
    MIN_CPU=4 # core
    MIN_RAM=7000000 #kibibyte

    NODES=$(kubectl get nodes --no-headers | awk '{print $1}')
    while IFS= read -r node; do
        CPU_CAPACITY=$(kubectl describe node "$node" | awk '/cpu:/{print $2; exit}')
        RAM_CAPACITY=$(kubectl describe node "$node" | awk '/memory:/{print $2; exit}')

        # Convert RAM_CAPACITY to kibibyte
        if [[ $RAM_CAPACITY =~ "Ki" ]]; then
            RAM_CAPACITY=$(echo $RAM_CAPACITY | sed 's/Ki//g')
        elif [[ $RAM_CAPACITY =~ "Mi" ]]; then
            RAM_CAPACITY=$(echo $RAM_CAPACITY | sed 's/Mi//g')
            RAM_CAPACITY=$(($RAM_CAPACITY * 1024))
        elif [[ $RAM_CAPACITY =~ "Gi" ]]; then
            RAM_CAPACITY=$(echo $RAM_CAPACITY | sed 's/Gi//g')
            RAM_CAPACITY=$(($RAM_CAPACITY * 1024 * 1024))
        elif [[ $RAM_CAPACITY =~ "Ti" ]]; then
            RAM_CAPACITY=$(echo $RAM_CAPACITY | sed 's/Ti//g')
            RAM_CAPACITY=$(($RAM_CAPACITY * 1024 * 1024 * 1024))
        fi

        # convert CPU_CAPACITY to core
        if [[ $CPU_CAPACITY =~ "m" ]]; then
            CPU_CAPACITY=$(echo $CPU_CAPACITY | sed 's/m//g')
            CPU_CAPACITY=$(($CPU_CAPACITY / 1000))
        fi

        if [[ $CPU_CAPACITY -lt $MIN_CPU || $RAM_CAPACITY -lt $MIN_RAM ]]; then
            echo -e "${INFO} CPU: $CPU_CAPACITY, RAM: $RAM_CAPACITY for Kubernetes node: $node."
            echo -e "${CROSS} Insufficient CPU or RAM for Kubernetes node: $node. Minimum requirement: $MIN_CPU cores, 8GB RAM.${NC}"
            exit 1
        fi

        echo -e "${CHECKMARK} CPU and RAM check passed for Kubernetes node: $node."
    done <<< "$NODES"
}

# Check Kubernetes, Helm, and the cluster
check_kubernetes() {
    echo -e "${GREEN}Checking Kubernetes, Helm, and the cluster...${NC}"
    if ! command -v kubectl &> /dev/null; then
        echo -e "${CROSS} kubectl not found. Please install kubectl.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} kubectl check passed."

    if ! command -v helm &> /dev/null; then
        echo -e "${CROSS} Helm not found. Please install Helm.${NC}"
        exit 1
    fi
    echo -e "${CHECKMARK} Helm check passed."

    # Check if Kubernetes cluster is reachable
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Cannot connect to the Kubernetes cluster. Please make sure the cluster is running.${NC}"
        exit 1
    fi

    # Check CPU and RAM for each Kubernetes node
    check_kubernetes_node_requirements
}

# Perform preflight checks based on the deployment option
preflight_checks() {
    case $DEPLOYMENT in
        docker)
        check_docker_requirements
        check_docker
        ;;
        kubernetes)
        check_kubernetes
        ;;
        *)
        echo -e "${RED}Invalid deployment option. Please specify 'docker' or 'kubernetes'.${NC}"
        exit 1
        ;;
    esac
}

# Deploy using Docker Compose
docker_deployment() {
    echo -e "${GREEN}Performing Docker deployment with image tag: $IMAGE_TAG${NC}"
    docker-compose -f deployment-scripts/docker-compose.yml up -d
}

# Deploy using Kubernetes and Helm
kubernetes_deployment() {
    echo -e "${GREEN}Performing Kubernetes deployment with image tag: $IMAGE_TAG${NC}"

    # Set values in Helm chart values.yaml
    CONSOLE_VALUES_FILE="deployment-scripts/helm-charts/deepfence-console/values.yaml"
    ROUTER_VALUES_FILE="deployment-scripts/helm-charts/deepfence-router/values.yaml"
    
    if [[ -z $STORAGE_CLASS ]]; then
        STORAGE_CLASS=$DEFAULT_STORAGE_CLASS
    fi

    if [[ -z $NEO4J_PASSWORD ]]; then
        NEO4J_PASSWORD=$DEFAULT_NEO4J_PASSWORD
    fi

    # Install deepfence-router
    helm upgrade --install deepfence-router deployment-scripts/helm-charts/deepfence-router --set global.imageTag="$IMAGE_TAG" --set global.storageClass="$STORAGE_CLASS" -f $ROUTER_VALUES_FILE

    # Install deepfence-console
    helm upgrade --install deepfence-console deployment-scripts/helm-charts/deepfence-console --set global.imageTag="$IMAGE_TAG" --set global.storageClass="$STORAGE_CLASS" --set neo4j.secrets.NEO4J_AUTH=neo4j/$NEO4J_PASSWORD -f $CONSOLE_VALUES_FILE

}

# Main script flow
preflight_checks

case $DEPLOYMENT in
    docker)
    docker_deployment
    ;;
    kubernetes)
    kubernetes_deployment
    ;;
    *)
    # This should not happen since we check the option earlier, but adding for completeness
    echo -e "${RED}Invalid deployment option. Please specify 'docker' or 'kubernetes'.${NC}"
    exit 1
    ;;
esac
