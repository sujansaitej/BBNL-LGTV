import { TextField } from "@mui/material";

const SearchTextField = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = "Enter 10 Digit Number",
  type = "tel",
  fullWidth = true,
  autoFocus = true,
  inputMode = "numeric",
  pattern = "[0-9]*",
  maxLength = 10,
  sx = {},
  InputProps = {},
}) => {
  return (
    <TextField
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      type={type}
      inputProps={{
        inputMode,
        pattern,
        maxLength,
        "data-webos-input": "true",
      }}
      InputProps={{
        ...InputProps,
        sx: {
          height: 56,
          bgcolor: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "14px",
          color: "#fff",
          fontSize: 16,
          fontWeight: 500,
          transition: "all 0.2s ease",
          "&:hover": {
            border: "1px solid #334155",
          },
          "&.Mui-focused": {
            border: "1px solid #2563EB",
            boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.1)",
          },
          "& fieldset": { border: "none" },
          "& input::placeholder": {
            color: "#475569",
            opacity: 1,
          },
          ...InputProps?.sx,
        },
      }}
      sx={sx}
    />
  );
};

export default SearchTextField;
