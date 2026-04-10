package validator

import (
	"regexp"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// RegisterCustomValidators registers custom validation tags for Gin's binding.
func RegisterCustomValidators() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		_ = v.RegisterValidation("slug", validateSlug)
	}
}

func validateSlug(fl validator.FieldLevel) bool {
	return slugRegex.MatchString(fl.Field().String())
}
