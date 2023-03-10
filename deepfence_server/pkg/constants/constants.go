package constants

const (
	ACR            = "azure_container_registry"
	DOCKER_HUB     = "docker_hub"
	DOCKER_PRIVATE = "docker_private_registry"
	ECR            = "ecr"
	ECR_PUBLIC     = "ecr-public"
	GCR            = "google_container_registry"
	GITLAB         = "gitlab"
	HARBOR         = "harbor"
	JFROG          = "jfrog_container_registry"
	QUAY           = "quay"
)

var RegistryTypes = []string{
	ACR, DOCKER_HUB, DOCKER_PRIVATE, ECR, GCR, GITLAB, HARBOR, JFROG, QUAY,
}
