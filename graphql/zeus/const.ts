/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	LoginInput:{
		loginType:"LoginType"
	},
	DateTime: `scalar.DateTime` as const,
	CreateClient:{

	},
	ChangePasswordInput:{

	},
	UserOps:{
		createVacation:{
			vacation:"CreateVacation"
		},
		deleteVacation:{

		}
	},
	SocialKind: "enum" as const,
	UpgradeAdminAccountInput:{

	},
	CreateLog:{
		start:"Time",
		date:"Date"
	},
	HourlyBillingOps:{
		update:{
			billingUpdate:"UpdateHourlyBilling"
		}
	},
	UpdateFixedBilling:{
		currency:"Currency"
	},
	RegisterAccount:{

	},
	Time: `scalar.Time` as const,
	UpdateHourlyBilling:{
		currency:"Currency"
	},
	AdminQuery:{
		billingById:{

		},
		clientById:{

		},
		logs:{
			dateFilter:"DateFilter",
			adminFilter:"AdminFilter"
		},
		projectById:{

		},
		userById:{

		},
		vacations:{
			date:"DateFilter"
		}
	},
	UserQuery:{
		logs:{
			dateFilter:"DateFilter"
		},
		vacations:{
			date:"DateFilter"
		}
	},
	AdminMutation:{
		clientOps:{

		},
		createClient:{
			createClient:"CreateClient"
		},
		createFixedBilling:{
			billing:"CreateFixedBilling"
		},
		createHourlyBilling:{
			billing:"CreateHourlyBilling"
		},
		createProject:{
			createProject:"CreateProject"
		},
		deleteInviteToken:{

		},
		fixedBillingOps:{

		},
		generateBillingPortal:{

		},
		generateCheckoutSession:{

		},
		generateInviteToken:{
			tokenOptions:"InviteTokenInput"
		},
		hourlyBillingOps:{

		},
		projectOps:{

		},
		removeUserFromTeam:{

		},
		upgradeAccount:{
			upgradeInput:"UpgradeAdminAccountInput"
		},
		userOps:{

		}
	},
	InviteTokenInput:{
		expires:"DateTime"
	},
	PublicQuery:{
		getGithubOAuthLink:{

		},
		login:{
			user:"LoginInput"
		},
		requestForForgotPassword:{

		}
	},
	Role: "enum" as const,
	Date: `scalar.Date` as const,
	CreateVacation:{

	},
	UpdateUserAccount:{

	},
	ClientOps:{
		update:{
			clientUpdate:"ClientUpdate"
		}
	},
	VerifyEmailInput:{

	},
	Currency: "enum" as const,
	FixedBillingOps:{
		update:{
			billingUpdate:"UpdateFixedBilling"
		}
	},
	DateFilter:{
		from:"Date",
		to:"Date"
	},
	AdminFilter:{
		asCurrency:"Currency"
	},
	CreateProject:{

	},
	UserMutation:{
		createVacation:{
			vacation:"CreateVacation"
		},
		deleteVacation:{

		},
		logOps:{

		},
		logTime:{
			log:"CreateLog"
		},
		updateUserAccount:{
			updateUserData:"UpdateUserAccount"
		}
	},
	UserLogOps:{
		update:{
			log:"UpdateLog"
		}
	},
	CreateHourlyBilling:{
		currency:"Currency"
	},
	LoginType: "enum" as const,
	RegisterUserAccount:{

	},
	UpdateLog:{
		start:"Time",
		date:"Date"
	},
	ProjectOps:{
		update:{
			projectUpdate:"ProjectUpdate"
		}
	},
	GenerateOAuthTokenInput:{
		social:"SocialKind"
	},
	ProjectUpdate:{

	},
	PublicMutation:{
		changePassword:{
			changePasswordData:"ChangePasswordInput"
		},
		generateOAuthToken:{
			tokenData:"GenerateOAuthTokenInput"
		},
		integrateSocialAccount:{
			userData:"SimpleUserInput"
		},
		registerAccount:{
			user:"RegisterAccount"
		},
		registerUserAccount:{
			user:"RegisterUserAccount"
		},
		verifyEmail:{
			verifyData:"VerifyEmailInput"
		}
	},
	ClientUpdate:{

	},
	CreateFixedBilling:{
		currency:"Currency"
	},
	SimpleUserInput:{

	}
}

export const ReturnTypes: Record<string,any> = {
	DateTime: `scalar.DateTime` as const,
	TimeLog:{
		_id:"String",
		account:"Account",
		archivedAt:"DateTime",
		billable:"TimeLogBilled",
		createdAt:"DateTime",
		date:"Date",
		description:"String",
		minutes:"Int",
		project:"Project",
		start:"Time",
		updatedAt:"DateTime",
		user:"User"
	},
	Account:{
		_id:"String",
		customerId:"String",
		name:"String",
		role:"String",
		username:"String"
	},
	TimeLogBilled:{
		amountBilled:"Float",
		currency:"Currency"
	},
	UserOps:{
		addAdmin:"Boolean",
		createVacation:"String",
		delAdmin:"Boolean",
		deleteVacation:"Boolean",
		remove:"Boolean"
	},
	Client:{
		_id:"String",
		account:"Account",
		archivedAt:"DateTime",
		createdAt:"DateTime",
		name:"String",
		projects:"Project",
		updatedAt:"DateTime"
	},
	HourlyBillingOps:{
		remove:"Boolean",
		update:"Boolean"
	},
	Time: `scalar.Time` as const,
	InviteToken:{
		domain:"String",
		expires:"String",
		owner:"String",
		token:"String"
	},
	AdminQuery:{
		account:"Account",
		billingById:"Billing",
		billings:"Billing",
		clientById:"Client",
		clients:"Client",
		getStripeProducts:"StripeProduct",
		logs:"TimeLog",
		projectById:"Project",
		projects:"Project",
		tokens:"InviteToken",
		userById:"User",
		users:"User",
		vacations:"Vacation"
	},
	StripeProduct:{
		currency:"String",
		description:"String",
		interval:"String",
		interval_count:"Int",
		name:"String",
		price_id:"String",
		price_value:"String",
		product_id:"String",
		trial_period_days:"Int"
	},
	FixedBilling:{
		_id:"String",
		account:"Account",
		createdAt:"DateTime",
		currency:"Currency",
		project:"Project",
		updatedAt:"DateTime",
		value:"Float"
	},
	UserQuery:{
		clients:"Client",
		logs:"TimeLog",
		me:"User",
		projects:"Project",
		vacations:"Vacation"
	},
	Project:{
		_id:"String",
		account:"Account",
		archivedAt:"DateTime",
		client:"Client",
		createdAt:"DateTime",
		name:"String",
		updatedAt:"DateTime"
	},
	AdminMutation:{
		clientOps:"ClientOps",
		createClient:"String",
		createFixedBilling:"String",
		createHourlyBilling:"String",
		createProject:"String",
		deleteInviteToken:"Boolean",
		fixedBillingOps:"FixedBillingOps",
		generateBillingPortal:"String",
		generateCheckoutSession:"String",
		generateInviteToken:"String",
		hourlyBillingOps:"HourlyBillingOps",
		projectOps:"ProjectOps",
		removeUserFromTeam:"Boolean",
		upgradeAccount:"String",
		userOps:"UserOps"
	},
	PublicQuery:{
		getAppleOAuthLink:"String",
		getGithubOAuthLink:"String",
		getGoogleOAuthLink:"String",
		login:"String",
		requestForForgotPassword:"Boolean"
	},
	Date: `scalar.Date` as const,
	ClientOps:{
		archive:"Boolean",
		remove:"Boolean",
		unArchive:"Boolean",
		update:"Boolean"
	},
	HourlyBilling:{
		_id:"String",
		account:"Account",
		createdAt:"DateTime",
		currency:"Currency",
		project:"Project",
		updatedAt:"DateTime",
		user:"User",
		value:"Float"
	},
	Node:{
		"...on TimeLog": "TimeLog",
		"...on Client": "Client",
		"...on FixedBilling": "FixedBilling",
		"...on Project": "Project",
		"...on HourlyBilling": "HourlyBilling",
		updatedAt:"DateTime",
		_id:"String",
		createdAt:"DateTime"
	},
	User:{
		_id:"String",
		account:"Account",
		nickname:"String",
		role:"Role",
		username:"String",
		vacations:"Vacation"
	},
	Mutation:{
		admin:"AdminMutation",
		publicMutation:"PublicMutation",
		user:"UserMutation",
		webhook:"String"
	},
	FixedBillingOps:{
		remove:"Boolean",
		update:"Boolean"
	},
	Vacation:{
		_id:"String",
		account:"Account",
		administrable:"Boolean",
		createdAt:"String",
		date:"String",
		updatedAt:"String",
		user:"User"
	},
	UserMutation:{
		createVacation:"String",
		deleteVacation:"Boolean",
		logOps:"UserLogOps",
		logTime:"String",
		updateUserAccount:"String"
	},
	UserLogOps:{
		delete:"Boolean",
		update:"Boolean"
	},
	ProjectOps:{
		archive:"Boolean",
		remove:"Boolean",
		unArchive:"Boolean",
		update:"Boolean"
	},
	PublicMutation:{
		changePassword:"Boolean",
		generateOAuthToken:"Boolean",
		integrateSocialAccount:"Boolean",
		registerAccount:"Boolean",
		registerUserAccount:"Boolean",
		verifyEmail:"Boolean"
	},
	Query:{
		admin:"AdminQuery",
		public:"PublicQuery",
		user:"UserQuery"
	},
	Subscription:{
		_id:"String",
		amount:"Int",
		billingPeriodEnds:"Int",
		cancelAtPeriodEnd:"Boolean",
		canceledAt:"Int",
		currency:"String",
		customerId:"String",
		name:"String",
		productId:"String",
		scubscriptionId:"String",
		status:"String",
		username:"String"
	},
	Billing:{
		"...on FixedBilling": "FixedBilling",
		"...on HourlyBilling": "HourlyBilling",
		value:"Float",
		currency:"Currency",
		account:"Account",
		project:"Project"
	},
	Archivable:{
		"...on Client": "Client",
		"...on Project": "Project",
		archivedAt:"DateTime"
	}
}

export const Ops = {
mutation: "Mutation" as const,
	query: "Query" as const,
	subscription: "Subscription" as const
}