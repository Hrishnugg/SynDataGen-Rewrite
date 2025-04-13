package logger

import (
	"log"

	"go.uber.org/zap"
)

var Logger *zap.Logger

func init() {
	// Configure logger based on environment (e.g., development vs production)
	config := zap.NewDevelopmentConfig()
	// Or use zap.NewProductionConfig() for production

	// Customize level (e.g., read from ENV)
	// config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)

	var err error
	Logger, err = config.Build()
	if err != nil {
		log.Fatalf("can't initialize zap logger: %v", err)
	}
	Logger.Info("Zap logger initialized")

	// Optional: Redirect standard log output to zap
	// zap.RedirectStdLog(Logger)
}

// Sync flushes any buffered log entries. Applications should take care to call
// Sync before exiting.
func Sync() {
	if Logger != nil {
		_ = Logger.Sync() // Ignore error for simplicity, handle in real app
	}
}
