<?php
class Finance
{
	//Accessor methods here will be made private in some cases
	//Discountability ???
	protected $amount_paid;
	protected $balance;
	protected $total_amount;

	public function __construct($total_amount,$amount_paid=0){
		$this->setTotalAmount($total_amount);
		$this->updateFinances($amount_paid);
	}

	public function updateFinances($the_amount_paid){
		$this->setPaidAmount($this->getPaidAmount() + $the_amount_paid);
	}

	protected function setBalance($new_balance){
		$this->balance = $new_balance;
	}

	public function getBalance(){
		return $this->balance;
	}

	protected function setTotalAmount($new_total){
		$this->total_amount = $new_total;
	}

	public function getAmount(){
		return $this->total_amount;
	}

	public function serialize($patient_id){
		try{
			$conn = new PDO("mysql:host=localhost;dbname=athena","athena","sysadminharryk");
			$conn->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
			$fin = $conn->prepare("INSERT INTO finance VALUES (null,:patient_id,:paid,:balance,:date)");
			$fin->bindParam(':balance',$this->getBalance());
			$fin->bindParam(':paid',$this->getPaidAmount());
			$fin->bindParam(':date',date("Y-m-d",strtotime("today")));
			$fin->bindParam(':patient_id',$patient_id);
			$fin->execute();
		}catch(PDOException $e){
			print $e->getMessage();
		}
	}

	protected function setPaidAmount($new_amount){
		$this->amount_paid = $new_amount;
		$this->setBalance($this->getAmount() - $this->getPaidAmount());
	}

	public function getPaidAmount(){
		return $this->amount_paid;
	}

	public function toHtml(){
		print<<<__EOFINANCE__
	<table border="1 solid #008080" style="width:100%">
	<tr>
	<td>Total Amount</td>
	<td>{$this->getAmount()}</td>
	</tr>
	<tr>
	<td>Amount Paid</td>
	<td>{$this->getPaidAmount()}</td>
	</tr>
	<tr>
	<td>Balance</td>
	<td>{$this->getBalance()}</td>
	</tr>
__EOFINANCE__;
	}
}

?>
