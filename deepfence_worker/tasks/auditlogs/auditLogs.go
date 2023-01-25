package auditlogs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
)

func AuditLogs(msg *message.Message) error {
	//namespace := msg.Metadata.Get(directory.NamespaceKey)
	//ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	ctx := directory.NewGlobalContext()
	_, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	return nil
}
