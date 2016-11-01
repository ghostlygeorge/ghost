<?php 
	session_start();
	unset($_SESSION['SESS_USERNAME']);
	unset($_SESSION['SESS_PASS']);
?>
<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet"
	type="text/css"
	href="login.css"/>
<title>Log in to your Account</title>
</head>
<body>
	<form name="loginform" method="POST" action="auth.php">
	<fieldset>
		<legend> Welcome </legend>
		<div class="Welcome-box">
			<div class="entry" >
		</div>
			<br>
			<div class="entry">
				<?php if(isset($_SESSION['ERRMSG_ARR']) && is_array($_SESSION['ERRMSG_ARR']) && count($_SESSION['ERRMSG_ARR']) > 0 ){
					echo '<ul class="err">';
						foreach($_SESSION['ERRMSG_ARR'] as $msg){
							echo '<li>', $msg, '</li>';
						}
					echo '</ul>';
					unset($_SESSION['ERRMSG_ARR']);
				}?>
				<span id="toleft">
			<label>Registration</label>
		</span>
		<span id="toright">
		<input type="text" name="reg" required="required">
		</span>
	</div>
			<br>
			<div class="entry">
				<span id="toleft">
			<label>Password</label>
		</span>
		<span id="toright">
			<input type="password" name="pass" required="required">
		</span>
	</div>
			<br>
			<button type="submit" >Log in</button>
		</div>
	</form>
</form>
</body>
</html>
