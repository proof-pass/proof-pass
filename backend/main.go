package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/go-redis/redis/v8"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kelseyhightower/envconfig"
	"github.com/proof-pass/proof-pass/backend/jwt"
	"github.com/proof-pass/proof-pass/backend/repos"
	"github.com/proof-pass/proof-pass/backend/server"
	"github.com/proof-pass/proof-pass/backend/service"
	"github.com/proof-pass/proof-pass/issuer/api/go/issuer/v1"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type appCfg struct {
	RestPort                 int    `default:"3000"`
	PostgresHost             string `default:"postgres.app.svc.cluster.local"`
	PostgresDatabase         string `default:"db"`
	PostgresPort             int    `default:"5432"`
	PostgresUsername         string `required:"true"`
	PostgresPassword         string `required:"true"`
	RedisAddr                string `default:"redis-master:6379"`
	IssuerAddr               string `default:"issuer.app.svc.cluster.local:9090"`
	IssuerChainID            int64  `required:"true"`
	EmailCredentialContextID int64  `default:"111"` // TODO: change to actual context ID and set to requried
	JWTSecretKey             string `required:"true"`
	JWTExpiresSec            int64  `required:"true"`
	EnableLoginEmail         bool   `required:"true"`
	EthRPCURL              	 string `required:"true"`
	ContextRegistryAddr      string `required:"true"`
}

func main() {
	// load the configuration from the environment variables
	var cfg appCfg
	envconfig.MustProcess("backend", &cfg)

	// set up logger
	log.Logger = log.With().Caller().Logger()
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	zerolog.DefaultContextLogger = &log.Logger

	// connect to the database
	pool, err := pgxpool.New(context.Background(), fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", cfg.PostgresHost, cfg.PostgresPort, cfg.PostgresUsername, cfg.PostgresPassword, cfg.PostgresDatabase))
	if err != nil {
		log.Fatal().Msgf("Unable to connect to database: %v", err)
	}
	defer pool.Close()
	dbClient := repos.NewClient(pool)

	// connect to Redis
	redisClient := redis.NewUniversalClient(&redis.UniversalOptions{Addrs: []string{cfg.RedisAddr}})

	// initialize AWS SES client if email login is enabled
	var sesClient *ses.Client
	if cfg.EnableLoginEmail {
		awsCfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion("us-west-2"))
		if err != nil {
			log.Fatal().Msgf("Unable to load AWS config: %v", err)
		}
		sesClient = ses.NewFromConfig(awsCfg)
	}

	// initialize JWT service
	jwtService := jwt.NewService(cfg.JWTSecretKey, cfg.JWTExpiresSec)

	// initialize issuer client at issuer.app.svc.cluster.local:9090
	issuerConn, err := grpc.NewClient(cfg.IssuerAddr, grpc.WithInsecure())
	if err != nil {
		log.Fatal().Msgf("Unable to connect to issuer: %v", err)
	}
	issuerClient := issuer.NewIssuerServiceClient(issuerConn)

	// initialize Ethereum client
	ethClient, err := ethclient.Dial(cfg.EthRPCURL)
	if err != nil {
		log.Fatal().Msgf("Unable to connect to Ethereum node: %v", err)
	}

	contextRegistryAddr := common.HexToAddress(cfg.ContextRegistryAddr)

	// initialize API service
	apiService := service.NewAPIService(
		cfg.EmailCredentialContextID,
		cfg.IssuerChainID,
		dbClient,
		redisClient,
		sesClient,
		jwtService,
		issuerClient,
		ethClient,
		contextRegistryAddr,
	)

	// create server
	server := server.New(dbClient, cfg.RestPort, apiService, jwtService)
	server.Start()
}
